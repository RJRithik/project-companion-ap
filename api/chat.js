// api/chat.js
//
// Switched to Google's Gemini API (using your student subscription's free
// access) instead of AssemblyAI's LLM Gateway. The overall flow is the
// same as before, but Gemini's request/response shape is genuinely
// different in a few important ways — noted in comments below.

import { requireUser } from "./_firebaseAdmin.js";

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const TOOLS = [
  {
    functionDeclarations: [
      {
        name: "update_project_tracker",
        description:
          "Update the project's tracked progress. Only include fields that should actually change based on what the user said.",
        parameters: {
          type: "OBJECT",
          properties: {
            phase: {
              type: "INTEGER",
              description:
                "New phase index: 0=Idea, 1=Planning, 2=Design, 3=Build, 4=Testing, 5=Launch. Only set this if the conversation clearly indicates the project moved to a different phase.",
            },
            percent: {
              type: "INTEGER",
              description: "New overall completion percentage (0-100), if it should change.",
            },
            openIssues: {
              type: "INTEGER",
              description: "New count of open issues/bugs, if it should change (increase when a new issue is mentioned, decrease when one is resolved).",
            },
          },
        },
      },
    ],
  },
];

function buildSystemPrompt(project) {
  return `You are ProjectPilot, an AI assistant helping someone plan and track a personal project by chatting with them.

Current project: "${project.name}"
Description: ${project.description || "(no description yet)"}
Current phase index: ${project.phase} (0=Idea, 1=Planning, 2=Design, 3=Build, 4=Testing, 5=Launch)
Current completion: ${project.percent}%
Current open issues: ${project.openIssues}

Be genuinely helpful: ask clarifying questions, suggest concrete next steps, and help brainstorm if the user doesn't have a clear plan yet. Keep replies conversational and not overly long.

When the conversation clearly indicates real progress (a phase actually changed, a bug was mentioned or resolved, completion changed), call update_project_tracker with ONLY the fields that changed. Do not call it for vague statements — only when something concrete actually happened. Never decrease the phase index unless the user explicitly says something was reverted.`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST requests are allowed." });
  }

  let uid;
  try {
    uid = await requireUser(req);
  } catch (err) {
    return res.status(err.statusCode || 401).json({ error: err.message });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Server is missing its Gemini API key." });
  }

  const { message, history, project } = req.body || {};
  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "Missing 'message' in request body." });
  }
  if (!project || typeof project !== "object") {
    return res.status(400).json({ error: "Missing 'project' in request body." });
  }

  // Gemini uses "user" and "model" roles (not "assistant"), and history is
  // just an ordinary array of turns rather than a separate parameter.
  const contents = [
    ...(Array.isArray(history)
      ? history.slice(-12).map((h) => ({
          role: h.role === "user" ? "user" : "model",
          parts: [{ text: h.text }],
        }))
      : []),
    { role: "user", parts: [{ text: message }] },
  ];

  const systemInstruction = { parts: [{ text: buildSystemPrompt(project) }] };

  try {
    // --- First call: let the model decide whether to use the tool ---
    const firstResp = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ contents, systemInstruction, tools: TOOLS }),
    });

    if (!firstResp.ok) {
      const errText = await firstResp.text();
      return res.status(502).json({ error: "AI request failed.", details: errText });
    }

    const firstData = await firstResp.json();
    const candidate = firstData.candidates?.[0];
    const parts = candidate?.content?.parts;

    if (!parts) {
      return res.status(502).json({ error: "AI response was empty or malformed." });
    }

    const functionCallPart = parts.find((p) => p.functionCall);

    // --- No tool used: just return the plain text reply ---
    if (!functionCallPart) {
      const textPart = parts.find((p) => p.text);
      return res.status(200).json({ reply: textPart?.text || "Got it.", updates: {} });
    }

    // --- Tool used: Gemini gives us the arguments as a real object
    // already (unlike AssemblyAI/OpenAI, which send a JSON string) ---
    const call = functionCallPart.functionCall;
    const updates = call.name === "update_project_tracker" ? { ...(call.args || {}) } : {};

    // --- Second call: send the function result back so we get a
    // natural-language reply, the same round-trip pattern as before. ---
    const followupContents = [
      ...contents,
      candidate.content, // the model's turn that included the functionCall
      {
        role: "user",
        parts: [
          {
            functionResponse: {
              name: call.name,
              response: { success: true, applied: updates },
              ...(call.id ? { id: call.id } : {}),
            },
          },
        ],
      },
    ];

    let replyText = "Updated your project tracker.";
    const secondResp = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ contents: followupContents, systemInstruction }),
    });

    if (secondResp.ok) {
      const secondData = await secondResp.json();
      const secondText = secondData.candidates?.[0]?.content?.parts?.find((p) => p.text)?.text;
      if (secondText) replyText = secondText;
    }

    return res.status(200).json({ reply: replyText, updates });
  } catch (err) {
    return res.status(500).json({ error: "Unexpected server error.", details: String(err) });
  }
}
