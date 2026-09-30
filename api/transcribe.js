// api/transcribe.js
//
// Takes a short recorded audio clip from the browser and returns its
// text transcription, using Gemini's audio-understanding feature.

import { requireUser } from "./_firebaseAdmin.js";

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// Gemini's supported audio formats (including webm & mp4 recorded by Chrome/Safari)
const SUPPORTED_MIME_TYPES = [
  "audio/webm",
  "audio/mp4",
  "audio/wav",
  "audio/mp3",
  "audio/mpeg",
  "audio/aiff",
  "audio/aac",
  "audio/ogg",
  "audio/flac",
];

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST requests are allowed." });
  }

  try {
    await requireUser(req);
  } catch (err) {
    return res.status(err.statusCode || 401).json({ error: err.message });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Server is missing its Gemini API key." });
  }

  const { audioBase64, mimeType } = req.body || {};
  if (!audioBase64 || typeof audioBase64 !== "string") {
    return res.status(400).json({ error: "Missing 'audioBase64' in request body." });
  }
  
  const cleanMimeType = mimeType ? mimeType.split(';')[0].trim() : "audio/webm";
  if (!SUPPORTED_MIME_TYPES.some((t) => cleanMimeType.startsWith(t))) {
    return res.status(400).json({
      error: `Unsupported audio format '${cleanMimeType}'. Supported: ${SUPPORTED_MIME_TYPES.join(", ")}.`,
    });
  }

  // Safety cap ~15MB base64
  if (audioBase64.length > 15_000_000) {
    return res.status(400).json({ error: "Audio clip is too long. Please keep clips under about a minute." });
  }

  try {
    const resp = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { text: "Transcribe this audio accurately. Return only the transcription text, with no commentary, quotes, or extra formatting." },
              { inlineData: { mimeType: cleanMimeType, data: audioBase64 } },
            ],
          },
        ],
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return res.status(502).json({ error: "Transcription request failed.", details: errText });
    }

    const data = await resp.json();
    const text = data.candidates?.[0]?.content?.parts?.find((p) => p.text)?.text;

    if (!text) {
      return res.status(502).json({ error: "Transcription came back empty. Please try again, or try a shorter clip." });
    }

    return res.status(200).json({ text: text.trim() });
  } catch (err) {
    return res.status(500).json({ error: "Unexpected server error.", details: String(err) });
  }
}
