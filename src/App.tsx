import React, { useState, useEffect, useRef } from 'react';
import { Plus, Send, Edit2, Check, FileText, MessageSquare, ArrowRight, Search, Settings, User, PanelLeftClose, PanelLeftOpen, Trash2, Loader2, Play, Mic } from 'lucide-react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { doc, collection, addDoc, updateDoc, onSnapshot, deleteDoc } from 'firebase/firestore';
import { auth, db, APP_ID } from './lib/firebase';

const GlobalStyles = () => (
  <style dangerouslySetInnerHTML={{ __html: `
    @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Barlow:wght@300;400;500;600&family=Poppins:wght@400;500;600&display=swap');

    .font-heading { font-family: 'Instrument Serif', serif; }
    .font-body { font-family: 'Barlow', sans-serif; }
    .font-poppins { font-family: 'Poppins', sans-serif; }

    .liquid-glass-strong {
      background: rgba(255,255,255,0.01);
      backdrop-filter: blur(50px);
      -webkit-backdrop-filter: blur(50px);
      border: none;
      box-shadow: 4px 4px 4px rgba(0,0,0,0.05), inset 0 1px 1px rgba(255,255,255,0.15);
      position: relative;
      overflow: hidden;
    }

    .frosted-panel {
      background: rgba(255, 255, 255, 0.42);
      -webkit-backdrop-filter: blur(18px) saturate(1.15);
      backdrop-filter: blur(18px) saturate(1.15);
      border: 1px solid rgba(0, 0, 0, 0.06);
      box-shadow: 0 18px 44px -26px rgba(0, 0, 0, 0.28);
    }

    .frosted-card {
      background: rgba(255, 255, 255, 0.75);
      -webkit-backdrop-filter: blur(12px);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(0, 0, 0, 0.04);
      box-shadow: 0 4px 12px rgba(0,0,0,0.03);
    }

    .pulse-ring { animation: pulse-ring 2s cubic-bezier(0.16, 1, 0.3, 1) infinite; }
    @keyframes pulse-ring { 0% { transform: scale(0.8); opacity: 0.5; } 100% { transform: scale(1.6); opacity: 0; } }

    .bounce-bar { animation: bounce 0.6s infinite alternate cubic-bezier(0.16, 1, 0.3, 1); }
    @keyframes bounce { 0% { height: 4px; } 100% { height: 16px; } }

    .fade-in-up { animation: fadeInUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; transform: translateY(20px); }
    @keyframes fadeInUp { to { opacity: 1; transform: translateY(0); } }

    .hero-title {
      font-family: 'Instrument Serif', serif;
      font-style: italic;
      letter-spacing: -0.02em;
      color: white;
      text-align: center;
    }

    .liquid-glass {
      background: rgba(255,255,255,0.01);
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      border: none;
      box-shadow: inset 0 1px 1px rgba(255,255,255,0.1);
      position: relative;
      overflow: hidden;
    }

    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
    ::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.2); }
  `}} />
);

// ---------------------------------------------------------------------
// LANDING PAGE (RESTORED) — cinematic scrubbed-video background. The
// video plays once, its frames are captured to canvases, then those
// frames are played back and forth (ping-pong) for a smooth looping
// motion effect, with a subtle parallax on mouse movement.
//
// Note: the video file is hosted on an external server we don't control.
// If it ever goes offline, the background will just not appear — the
// rest of the page still works. Swap VIDEO_SRC for your own hosted video
// any time.
// ---------------------------------------------------------------------
const LandingPage = ({ onEnter }: { onEnter: () => void }) => {
  const VIDEO_SRC = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260511_080827_a9e5ad52-b6ee-4e79-b393-d936f179cfd7.mp4';

  const [mounted, setMounted] = useState(false);
  const [framesReady, setFramesReady] = useState(false);
  const [promptText, setPromptText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [showAuthGate, setShowAuthGate] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const videoBgRef = useRef<HTMLDivElement>(null);
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);
  const framesRef = useRef<HTMLCanvasElement[]>([]);

  useEffect(() => {
    setMounted(true);
    let capturing = true;
    let lastTime = -1;
    const MAX_WIDTH = 960;
    const frames: HTMLCanvasElement[] = [];
    const video = videoRef.current;
    if (!video) return;

    const captureFrame = () => {
      if (!capturing || video.readyState < 2) return;
      if (video.currentTime !== lastTime) {
        lastTime = video.currentTime;
        const w = video.videoWidth;
        const h = video.videoHeight;
        if (w > 0 && h > 0) {
          const scale = Math.min(1, MAX_WIDTH / w);
          const sw = w * scale;
          const sh = h * scale;
          const canvas = document.createElement('canvas');
          canvas.width = sw;
          canvas.height = sh;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, sw, sh);
            frames.push(canvas);
          }
        }
      }
      if (video.ended) {
        capturing = false;
        framesRef.current = frames;
        setFramesReady(true);
      } else if ('requestVideoFrameCallback' in video) {
        (video as any).requestVideoFrameCallback(captureFrame);
      } else {
        requestAnimationFrame(captureFrame);
      }
    };

    const onLoaded = () => {
      video.play().catch(() => {});
      if ('requestVideoFrameCallback' in video) {
        (video as any).requestVideoFrameCallback(captureFrame);
      } else {
        requestAnimationFrame(captureFrame);
      }
    };

    video.addEventListener('loadedmetadata', onLoaded);
    if (video.readyState >= 1) onLoaded();

    return () => {
      capturing = false;
      video.removeEventListener('loadedmetadata', onLoaded);
    };
  }, []);

  useEffect(() => {
    if (!framesReady || !displayCanvasRef.current || framesRef.current.length === 0) return;
    const canvas = displayCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = framesRef.current[0].width;
    canvas.height = framesRef.current[0].height;

    let index = 0;
    let direction = 1;
    let last = performance.now();
    const interval = 1000 / 30;
    let rafId = 0;

    const render = (now: number) => {
      if (now - last >= interval) {
        last = now;
        const frame = framesRef.current[index];
        if (frame) ctx.drawImage(frame, 0, 0);
        index += direction;
        if (index >= framesRef.current.length - 1) {
          index = framesRef.current.length - 1;
          direction = -1;
        } else if (index <= 0) {
          index = 0;
          direction = 1;
        }
      }
      rafId = requestAnimationFrame(render);
    };
    rafId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafId);
  }, [framesReady]);

  useEffect(() => {
    let currentX = 0, currentY = 0;
    let targetX = 0, targetY = 0;
    const strength = 20;
    let rafId = 0;

    const onMouseMove = (e: MouseEvent) => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      targetX = ((e.clientX - cx) / cx) * strength;
      targetY = ((e.clientY - cy) / cy) * strength;
    };

    const renderParallax = () => {
      currentX += (targetX - currentX) * 0.06;
      currentY += (targetY - currentY) * 0.06;
      if (videoBgRef.current) {
        videoBgRef.current.style.transform = `translate(${currentX}px, ${currentY}px) scale(1.08)`;
      }
      rafId = requestAnimationFrame(renderParallax);
    };

    window.addEventListener('mousemove', onMouseMove);
    rafId = requestAnimationFrame(renderParallax);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      cancelAnimationFrame(rafId);
    };
  }, []);

  const handlePromptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (promptText.trim() || isListening) {
      setShowAuthGate(true);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-body overflow-x-hidden relative flex flex-col">
      <div ref={videoBgRef} className="fixed top-0 left-0 w-full h-full z-0 scale-[1.08] origin-center">
        <video
          ref={videoRef}
          src={VIDEO_SRC}
          muted
          playsInline
          preload="auto"
          crossOrigin="anonymous"
          className="w-full h-full object-cover opacity-80"
          style={{ display: framesReady ? 'none' : 'block' }}
        />
        <canvas
          ref={displayCanvasRef}
          className="w-full h-full object-cover opacity-80"
          style={{ display: framesReady ? 'block' : 'none' }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />
      </div>

      <nav className="relative z-50 px-6 py-6 flex justify-between items-center w-full">
        <div className={`transition-all duration-1000 ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`}>
          <span className="font-semibold text-white text-xl tracking-tight">ProjectPilot</span>
        </div>
        <div className={`flex items-center gap-4 transition-all duration-1000 delay-100 ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'}`}>
          <button onClick={onEnter} className="text-sm font-medium text-white/80 hover:text-white transition-colors duration-200">
            Sign in
          </button>
          <button onClick={onEnter} className="liquid-glass-strong text-sm font-medium text-white rounded-full px-6 py-2.5 transition-all duration-200 hover:scale-[1.04] active:scale-[0.97]">
            Sign up
          </button>
        </div>
      </nav>

      <div className="relative z-20 flex-1 flex flex-col items-center justify-center px-4 -mt-10">
        <div className={`text-center mb-10 transition-all duration-1000 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <h1 className="hero-title text-white select-none mb-2" style={{ fontSize: 'clamp(64px, 12vw, 140px)' }}>
            ProjectPilot
          </h1>
          <p className="text-white/80 text-lg md:text-xl font-light max-w-2xl mx-auto tracking-wide">
            Describe your idea, and let our intelligent workspace set it up.
          </p>
        </div>

        <div className={`w-full max-w-2xl transition-all duration-1000 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <form onSubmit={handlePromptSubmit} className="liquid-glass-strong rounded-[24px] p-2 flex flex-col shadow-[0_8px_32px_rgba(0,0,0,0.3)] relative group focus-within:bg-white/5 transition-colors duration-300">
            <textarea
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handlePromptSubmit(e as any);
                }
              }}
              className="w-full bg-transparent text-white text-lg placeholder:text-white/50 resize-none outline-none min-h-[120px] p-4 font-body leading-relaxed"
              placeholder="e.g. We are building a mobile app for plant care. I need a roadmap with design, build, and test phases..."
            />
            <div className="flex justify-between items-center px-2 pb-2">
              <div className="flex items-center gap-1">
                <button type="button" className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors">
                  <Plus size={20} />
                </button>
                <button
                  type="button"
                  onClick={() => setIsListening(!isListening)}
                  className={`h-10 px-3 rounded-full transition-all duration-300 flex items-center justify-center gap-2 ${isListening ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.4)]' : 'hover:bg-white/10 text-white/70 hover:text-white'}`}
                >
                  <Mic size={18} />
                  {isListening && <span className="text-xs font-semibold pr-1">Listening...</span>}
                </button>
              </div>
              <button
                type="submit"
                disabled={!promptText.trim() && !isListening}
                className="w-10 h-10 flex items-center justify-center bg-white text-black rounded-full hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100 shadow-lg"
              >
                <Send size={16} className="ml-0.5" />
              </button>
            </div>
          </form>
        </div>
      </div>

      {showAuthGate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity" onClick={() => setShowAuthGate(false)} />
          <div className="liquid-glass-strong rounded-[32px] p-8 md:p-10 w-full max-w-md relative z-10 text-center shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-6 border border-white/20">
              <User size={28} className="text-white" />
            </div>
            <h3 className="text-2xl font-semibold text-white mb-2">Sign up to build</h3>
            <p className="text-white/70 mb-8 font-light">
              Save your prompt and let ProjectPilot set up your entire workspace instantly.
            </p>
            <div className="flex flex-col gap-3">
              <button onClick={onEnter} className="w-full bg-white text-black font-medium py-3.5 rounded-2xl hover:bg-white/90 transition-colors">
                Create free account
              </button>
              <button onClick={onEnter} className="w-full bg-transparent border border-white/30 text-white font-medium py-3.5 rounded-2xl hover:bg-white/10 transition-colors">
                Sign in to existing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------
// AUTH SCREEN — real email/password accounts via Firebase Auth.
// ---------------------------------------------------------------------
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';

const JUNGLEMIND_VIDEO = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260831_232706_43757be4-2250-4f09-8cd7-23aebbf147ad.mp4';
const JUNGLEMIND_POSTER = 'https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260831_223518_f11bfa03-4e65-47e1-a4a7-30e42a7a8c2f.png&w=1920&q=85';

const AuthScreen = ({ onAuthed }: { onAuthed: () => void }) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      onAuthed();
    } catch (err: any) {
      setError(err?.message?.replace('Firebase: ', '') || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 font-body overflow-hidden">
      <video
        autoPlay muted loop playsInline preload="auto" poster={JUNGLEMIND_POSTER}
        className="absolute inset-0 w-full h-full object-cover z-0"
        src={JUNGLEMIND_VIDEO}
      />
      <div className="absolute inset-0 bg-black/55 z-0" />
      <div className="liquid-glass-strong rounded-[24px] p-8 w-full max-w-sm text-white relative z-10">
        <h1 className="text-2xl font-semibold text-center mb-1">ProjectPilot</h1>
        <p className="text-white/60 text-sm text-center mb-6">
          {mode === 'login' ? 'Welcome back.' : 'Create your account.'}
        </p>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-white/10 border border-white/15 rounded-xl px-4 py-3 text-sm outline-none focus:border-white/40 placeholder:text-white/40"
          />
          <input
            type="password"
            required
            minLength={6}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-white/10 border border-white/15 rounded-xl px-4 py-3 text-sm outline-none focus:border-white/40 placeholder:text-white/40"
          />
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="mt-1 w-full bg-white text-black font-medium py-3 rounded-xl hover:bg-white/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>
        <button
          onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }}
          className="w-full text-center text-white/60 text-xs mt-4 hover:text-white transition-colors"
        >
          {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  );
};

const WorkspacePhaseStepper = ({ current }: { current: number }) => {
  const phases = ['Idea', 'Planning', 'Design', 'Build', 'Testing', 'Launch'];
  return (
    <div className="flex items-center justify-between w-full mt-2 relative">
      <div className="absolute top-3 left-4 right-4 h-[2px] bg-black/10 -z-10" />
      {phases.map((p, i) => {
        const completed = i < current;
        const isActive = i === current;
        return (
          <div key={p} className="flex flex-col items-center gap-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center relative bg-white border-2 transition-colors duration-500
              ${completed ? 'border-[#3ECF8E] bg-[#3ECF8E]' : isActive ? 'border-[#111111]' : 'border-black/20'}`}>
              {completed && <Check size={12} className="text-white" />}
              {isActive && <div className="absolute inset-0 rounded-full border border-[#111111] pulse-ring" />}
            </div>
            <span className={`text-[10px] uppercase font-semibold transition-colors duration-500 ${isActive ? 'text-[#111111]' : 'text-[#5c5c5c]'}`}>
              {p}
            </span>
          </div>
        );
      })}
    </div>
  );
};

const WorkspaceRing = ({ percent }: { percent: number }) => {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  return (
    <div className="flex items-center gap-4">
      <div className="relative w-20 h-20">
        <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
          <circle cx="40" cy="40" r={radius} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="6" />
          <circle cx="40" cy="40" r={radius} fill="none" stroke="#111111" strokeWidth="6" strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={offset} className="transition-all duration-1000 ease-out" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center font-bold text-xl text-[#111111]">
          {percent}%
        </div>
      </div>
      <p className="text-sm font-medium text-[#5c5c5c]">
        {Math.floor(percent / 16.6)} of 6 phases complete.
      </p>
    </div>
  );
};

const NewProjectScreen = ({ user, onProjectCreated, onCancel }: { user: FirebaseUser, onProjectCreated: (project: any) => void, onCancel: () => void }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name.trim()) return;
    setLoading(true);
    try {
      const newProject = {
        name: name.trim(),
        description: description.trim(),
        phase: 0,
        percent: 0,
        openIssues: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      const docRef = await addDoc(collection(db, 'artifacts', APP_ID, 'users', user.uid, 'projects'), newProject);
      onProjectCreated({ id: docRef.id, ...newProject });
    } catch (err) {
      console.error('Error creating project', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative z-10 w-full h-full flex items-center justify-center p-4 fade-in-up">
      <div className="frosted-panel rounded-[24px] p-8 md:p-12 w-full max-w-xl text-center shadow-2xl">
        <h2 className="text-3xl font-semibold text-[#111111] mb-8 tracking-tight">Start a new project.</h2>
        <form className="flex flex-col gap-5 text-left" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-[#111111] mb-1">Project Name</label>
            <input
              type="text" autoFocus required value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Website Redesign"
              className="w-full bg-white/60 border border-black/10 rounded-xl px-4 py-3 text-[#111111] placeholder:text-black/40 outline-none focus:border-[#111111] transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#111111] mb-1">Brief Description</label>
            <textarea
              required rows={3} value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What are we building?"
              className="w-full bg-white/60 border border-black/10 rounded-xl px-4 py-3 text-[#111111] placeholder:text-black/40 outline-none focus:border-[#111111] transition-colors resize-none"
            />
          </div>
          <div className="flex justify-end gap-3 mt-2">
            <button type="button" onClick={onCancel} className="px-5 py-2.5 rounded-xl text-sm font-medium text-[#5c5c5c] hover:bg-black/5 transition-colors">Cancel</button>
            <button type="submit" disabled={loading || !name.trim()} className="px-6 py-2.5 rounded-xl text-sm font-medium bg-[#111111] text-white hover:bg-black transition-colors flex items-center gap-2 disabled:opacity-50">
              {loading ? <Loader2 size={16} className="animate-spin" /> : 'Create Project'} <ArrowRight size={16} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const WorkspaceChatLayout = ({ user, projects, currentProject, setCurrentProject, onNewProject }: { user: FirebaseUser, projects: any[], currentProject: any, setCurrentProject: (p: any) => void, onNewProject: () => void }) => {
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingMimeTypeRef = useRef<string>('');

  // Gemini's audio understanding supports WAV, MP3, AIFF, AAC, OGG, FLAC —
  // notably NOT the "webm" format Chrome records by default. We ask the
  // browser for OGG specifically so the transcription actually works.
  const pickRecordingMimeType = (): string | null => {
    const preferred = ['audio/ogg;codecs=opus', 'audio/ogg', 'audio/wav'];
    for (const type of preferred) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return null;
  };

  const startRecording = async () => {
    setVoiceError('');
    const mimeType = pickRecordingMimeType();
    if (!mimeType) {
      setVoiceError("Your browser can't record in a format Gemini supports (needs OGG or WAV). Try a different browser, like current Chrome or Firefox.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType });
      recordingMimeTypeRef.current = mimeType;
      recordedChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        void transcribeRecording();
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);

      // Safety cap: auto-stop after 60 seconds so a forgotten recording
      // doesn't run forever or produce an oversized upload.
      setTimeout(() => {
        if (mediaRecorderRef.current === recorder && recorder.state === 'recording') {
          recorder.stop();
        }
      }, 60_000);
    } catch (err: any) {
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        setVoiceError('Microphone access was denied. Please allow microphone access and try again.');
      } else if (err?.name === 'NotFoundError') {
        setVoiceError('No microphone found.');
      } else {
        setVoiceError('Could not start recording. Please try again.');
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const transcribeRecording = async () => {
    if (recordedChunksRef.current.length === 0) return;
    setIsTranscribing(true);
    setVoiceError('');
    try {
      const blob = new Blob(recordedChunksRef.current, { type: recordingMimeTypeRef.current });
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          // Strip the "data:audio/ogg;base64," prefix — Gemini wants raw base64.
          resolve(result.split(',')[1] || '');
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      const token = await user.getIdToken();
      const resp = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ audioBase64: base64, mimeType: recordingMimeTypeRef.current }),
      });
      const data = await resp.json();

      if (!resp.ok) {
        setVoiceError(data.error || 'Transcription failed. Please try again.');
        return;
      }

      // Drop the transcribed text into the input box for review — the
      // user can edit it before sending, rather than it being sent
      // automatically, since transcription can occasionally be wrong.
      setInputText((prev) => (prev ? `${prev} ${data.text}` : data.text));
    } catch (err) {
      setVoiceError('Something went wrong sending the recording. Please try again.');
    } finally {
      setIsTranscribing(false);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };
  const [activeTab, setActiveTab] = useState<'chat' | 'progress'>('chat');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user || !currentProject) return;
    const msgsRef = collection(db, 'artifacts', APP_ID, 'users', user.uid, 'projects', currentProject.id, 'messages');
    const unsubscribe = onSnapshot(msgsRef, (snap) => {
      const fetched = snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => a.createdAt - b.createdAt);
      setMessages(fetched);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }, (error) => console.error('Error fetching messages:', error));
    return () => unsubscribe();
  }, [user, currentProject]);

  const filteredProjects = projects.filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !user || !currentProject || isSending) return;

    const textToSend = inputText.trim();
    setInputText('');
    setIsSending(true);

    const msgsRef = collection(db, 'artifacts', APP_ID, 'users', user.uid, 'projects', currentProject.id, 'messages');
    const projectRef = doc(db, 'artifacts', APP_ID, 'users', user.uid, 'projects', currentProject.id);

    await addDoc(msgsRef, { text: textToSend, sender: 'user', createdAt: Date.now() });

    try {
      const token = await user.getIdToken();
      const recentHistory = messages.slice(-12).map((m) => ({ role: m.sender === 'user' ? 'user' : 'assistant', text: m.text }));
      const resp = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          message: textToSend,
          history: recentHistory,
          project: { name: currentProject.name, description: currentProject.description, phase: currentProject.phase, percent: currentProject.percent, openIssues: currentProject.openIssues },
        }),
      });
      const data = await resp.json();

      if (!resp.ok) {
        // Show the REAL error from the server instead of a generic
        // message, so problems are visible instead of silently hidden.
        console.error('Chat request failed:', resp.status, data);
        const detailText = data.details ? ` — ${typeof data.details === 'string' ? data.details.slice(0, 300) : JSON.stringify(data.details).slice(0, 300)}` : '';
        await addDoc(msgsRef, {
          text: `⚠️ Server error (${resp.status}): ${data.error || 'Unknown error.'}${detailText}`,
          sender: 'ai',
          createdAt: Date.now(),
        });
        return;
      }

      await addDoc(msgsRef, { text: data.reply || "Got it.", sender: 'ai', createdAt: Date.now() });

      if (data.updates && Object.keys(data.updates).length > 0) {
        await updateDoc(projectRef, { ...data.updates, updatedAt: Date.now() });
      }
    } catch (err) {
      console.error('Chat request failed (network/exception)', err);
      await addDoc(msgsRef, { text: `⚠️ Couldn't reach the assistant: ${String(err)}`, sender: 'ai', createdAt: Date.now() });
    } finally {
      setIsSending(false);
    }
  };

  const deleteProject = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'artifacts', APP_ID, 'users', user.uid, 'projects', projectId));
      if (currentProject?.id === projectId) {
        setCurrentProject(projects.find((p) => p.id !== projectId) || null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!currentProject) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-black/5 flex items-center justify-center text-[#111] mb-4">
          <FileText size={28} />
        </div>
        <h3 className="text-xl font-semibold text-[#111]">No projects selected</h3>
        <p className="text-sm text-[#5c5c5c] mt-2 max-w-sm mb-6">Select a project from the sidebar or create a new one to start working.</p>
        <button onClick={onNewProject} className="bg-[#111] text-white px-6 py-2.5 rounded-full text-sm font-medium hover:bg-black transition-colors flex items-center gap-2">
          <Plus size={16} /> Create Project
        </button>
      </div>
    );
  }

  return (
    <div className="relative z-10 w-full h-full flex overflow-hidden font-poppins">
      <aside className={`absolute md:relative z-40 h-full bg-[#f4f7f4]/95 backdrop-blur-xl border-r border-black/10 flex flex-col transition-all duration-300 shrink-0 ${sidebarOpen ? 'w-72 translate-x-0' : 'w-0 -translate-x-full md:w-0 md:translate-x-0 overflow-hidden'}`}>
        <div className="p-4 flex items-center justify-between border-b border-black/5">
          <div className="flex items-center gap-2.5">
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
              <path d="M16 2.5 29.5 16 16 29.5 2.5 16 16 2.5Z" stroke="#111" strokeWidth="2.2" strokeLinejoin="round" />
              <path d="M16 9.5 22.5 16 16 22.5 9.5 16 16 9.5Z" fill="#111" />
            </svg>
            <span className="font-semibold text-[#111] text-lg tracking-tight">ProjectPilot</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="text-[#5c5c5c] hover:text-[#111] p-1.5 rounded-lg hover:bg-black/5 transition-colors">
            <PanelLeftClose size={20} />
          </button>
        </div>

        <div className="p-3 flex flex-col gap-2">
          <button onClick={onNewProject} className="flex items-center gap-3 w-full bg-[#111] text-white px-4 py-3 rounded-2xl font-medium text-sm hover:bg-black transition-all shadow-sm">
            <Plus size={18} /> New project
          </button>
          <div className="relative mt-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5c5c5c]" />
            <input type="text" placeholder="Search projects..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/60 border border-black/10 rounded-xl pl-10 pr-3 py-2 text-xs text-[#111] placeholder:text-black/40 outline-none focus:border-[#111] transition-colors" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-1">
          <span className="px-3 text-[11px] font-bold tracking-wider text-[#5c5c5c] mb-1">YOUR PROJECTS</span>
          {filteredProjects.length === 0 && <div className="px-3 text-xs text-[#5c5c5c] italic">No projects found.</div>}
          {filteredProjects.map((p) => (
            <div key={p.id} className="group relative flex items-center w-full">
              <button onClick={() => setCurrentProject(p)}
                className={`flex-1 text-left px-3 py-2 rounded-xl text-xs transition-colors truncate ${currentProject.id === p.id ? 'bg-black/10 font-semibold text-[#111]' : 'text-[#1a1a1a] hover:bg-black/5 font-medium'}`}>
                {p.name}
              </button>
              <button onClick={(e) => deleteProject(e, p.id)} className="absolute right-2 opacity-0 group-hover:opacity-100 p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition-all">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        <div className="p-3 border-t border-black/5 flex items-center justify-between bg-white/40">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#111] text-white flex items-center justify-center text-xs font-semibold">
              <User size={14} />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-xs font-medium text-[#111] truncate max-w-[120px]">{user.email}</span>
              <button onClick={() => auth.signOut()} className="text-[10px] text-[#5c5c5c] hover:text-[#111] text-left">Sign out</button>
            </div>
          </div>
          <button className="p-2 rounded-xl text-[#5c5c5c] hover:text-[#111] hover:bg-black/5 transition-colors">
            <Settings size={18} />
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col h-full overflow-hidden p-4 lg:p-6 gap-4">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            {!sidebarOpen && (
              <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-xl frosted-panel text-[#111] hover:bg-white transition-colors">
                <PanelLeftOpen size={20} />
              </button>
            )}
            <div className="frosted-panel rounded-full px-4 py-2 flex items-center gap-3 shadow-sm">
              <div className="w-2 h-2 rounded-full bg-[#111] pulse-ring" />
              <span className="text-xs font-medium text-[#111]">Project Active</span>
              <span className="text-xs font-semibold text-[#111] border-l border-black/10 pl-3">{currentProject.name}</span>
            </div>
          </div>
          <div className="lg:hidden frosted-panel rounded-full p-1 flex items-center gap-1 shadow-sm">
            <button onClick={() => setActiveTab('chat')} className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-200 flex items-center gap-1.5 ${activeTab === 'chat' ? 'bg-[#111111] text-white shadow-md' : 'text-[#5c5c5c] hover:text-[#111111] hover:bg-black/5'}`}>
              <MessageSquare size={14} /> Chat
            </button>
            <button onClick={() => setActiveTab('progress')} className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-200 flex items-center gap-1.5 ${activeTab === 'progress' ? 'bg-[#111111] text-white shadow-md' : 'text-[#5c5c5c] hover:text-[#111111] hover:bg-black/5'}`}>
              <FileText size={14} /> Status
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden">
          <div className={`flex-1 flex flex-col gap-4 overflow-hidden ${activeTab !== 'chat' ? 'hidden lg:flex' : 'flex'}`}>
            <div className="flex-1 frosted-panel rounded-[24px] p-4 lg:p-6 overflow-y-auto flex flex-col gap-5">
              {messages.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
                  <div className="w-12 h-12 rounded-full bg-black/5 flex items-center justify-center text-[#111] mb-3">
                    <MessageSquare size={20} />
                  </div>
                  <p className="text-[#111] font-medium text-sm mb-1">Let's build {currentProject.name}</p>
                  <p className="text-[#5c5c5c] text-xs max-w-[250px]">I can help you brainstorm, update your project phases, and track issues.</p>
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <div key={msg.id || idx} className={`flex gap-3 max-w-[85%] ${msg.sender === 'user' ? 'self-end flex-row-reverse' : 'self-start'}`}>
                    {msg.sender === 'ai' && (
                      <div className="w-8 h-8 rounded-full bg-white border border-black/10 flex items-center justify-center shrink-0 shadow-sm mt-1">
                        <svg viewBox="0 0 32 32" fill="none" className="w-4 h-4">
                          <path d="M16 2.5 29.5 16 16 29.5 2.5 16 16 2.5Z" stroke="#111111" strokeWidth="2.5" strokeLinejoin="round" />
                          <path d="M16 9.5 22.5 16 16 22.5 9.5 16 16 9.5Z" fill="#111111" />
                        </svg>
                      </div>
                    )}
                    <div className={`flex flex-col gap-1 ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                      <div className={`${msg.sender === 'user' ? 'bg-[#111111] text-white rounded-tr-sm' : 'frosted-card text-[#111111] rounded-tl-sm'} px-5 py-3 rounded-[20px] text-[14px] leading-relaxed shadow-sm`}>
                        {msg.text}
                      </div>
                      <span className="text-[10px] text-[#5c5c5c] px-1">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))
              )}
              {isSending && (
                <div className="flex gap-3 max-w-[85%] self-start">
                  <div className="w-8 h-8 rounded-full bg-white border border-black/10 flex items-center justify-center shrink-0 shadow-sm mt-1">
                    <Loader2 size={14} className="animate-spin text-[#111]" />
                  </div>
                  <div className="frosted-card text-[#5c5c5c] px-5 py-3 rounded-[20px] text-[13px] italic">thinking…</div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {voiceError && (
              <div className="mb-2 rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-[12px] text-red-600 flex items-center justify-between">
                <span>{voiceError}</span>
                <button onClick={() => setVoiceError('')} className="ml-2 text-red-400 hover:text-red-600">✕</button>
              </div>
            )}
            <form className="w-full bg-white/42 backdrop-blur-lg border border-black/5 rounded-[20px] p-[16px_16px_12px] text-left shadow-[0_8px_30px_-15px_rgba(0,0,0,0.15)] shrink-0" onSubmit={handleSendMessage}>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(e as any); } }}
                className="w-full border-0 outline-none resize-none bg-transparent font-inherit text-[14px] leading-relaxed text-[#111111] min-h-[44px] p-1 placeholder:text-[#3d3d3d] placeholder:opacity-72"
                rows={2}
                placeholder={isTranscribing ? 'Transcribing your recording…' : 'Type a message...'}
                disabled={isTranscribing}
              />
              <div className="flex items-center justify-between gap-3 mt-1">
                <button className="inline-flex items-center justify-center w-[36px] h-[36px] rounded-full border border-black/10 bg-white text-[#1a1a1a] hover:bg-[#f1f1ef] transition-colors" type="button">
                  <Plus size={16} strokeWidth={2} />
                </button>
                <div className="flex items-center gap-2">
                  <div className="relative flex items-center justify-center">
                    {isRecording && <span className="absolute inset-0 rounded-full bg-red-500/40 animate-ping" />}
                    <button
                      type="button"
                      onClick={toggleRecording}
                      disabled={isTranscribing}
                      aria-pressed={isRecording}
                      aria-label={isRecording ? 'Stop recording' : 'Start voice input'}
                      className={`relative inline-flex items-center justify-center w-[36px] h-[36px] rounded-full transition-colors disabled:opacity-50 ${
                        isRecording ? 'bg-red-500 text-white' : 'border border-black/10 bg-white text-[#1a1a1a] hover:bg-[#f1f1ef]'
                      }`}
                    >
                      {isTranscribing ? <Loader2 size={16} className="animate-spin" /> : <Mic size={16} strokeWidth={2} />}
                    </button>
                  </div>
                  <button className="inline-flex items-center justify-center bg-[#141414] text-white w-[40px] h-[40px] rounded-[12px] hover:bg-black transition-colors disabled:opacity-50" type="submit" disabled={!inputText.trim() || isSending}>
                    <Send size={16} strokeWidth={2} />
                  </button>
                </div>
              </div>
            </form>
          </div>

          <div className={`w-full lg:w-[420px] shrink-0 overflow-y-auto pb-6 pr-1 ${activeTab !== 'progress' ? 'hidden lg:block' : 'block'}`}>
            <div className="flex flex-col gap-4">
              <div className="frosted-panel rounded-[24px] p-5 shadow-sm">
                <h3 className="text-[10px] font-bold tracking-wider text-[#5c5c5c] mb-4">PROJECT PHASE</h3>
                <WorkspacePhaseStepper current={currentProject.phase} />
              </div>
              <div className="flex gap-4">
                <div className="flex-1 frosted-panel rounded-[24px] p-5 shadow-sm flex flex-col justify-center items-center">
                  <h3 className="text-[10px] font-bold tracking-wider text-[#5c5c5c] mb-3 w-full text-center">COMPLETION</h3>
                  <div className="py-1 scale-90"><WorkspaceRing percent={Math.round(currentProject.percent)} /></div>
                </div>
                <div className="flex-1 frosted-panel rounded-[24px] p-5 shadow-sm flex flex-col justify-center items-center text-center">
                  <h3 className="text-[10px] font-bold tracking-wider text-[#5c5c5c] mb-3">ISSUES</h3>
                  <div className="text-3xl font-semibold text-[#111111] flex items-center justify-center w-14 h-14 rounded-full bg-white border border-black/5 shadow-sm">
                    {currentProject.openIssues || 0}
                  </div>
                  <span className="text-[11px] text-[#5c5c5c] mt-2 font-medium">Pending Action</span>
                </div>
              </div>
              <div className="frosted-panel rounded-[24px] p-5 shadow-sm">
                <h3 className="text-[10px] font-bold tracking-wider text-[#5c5c5c] mb-4">PROJECT DETAILS</h3>
                <div className="text-sm text-[#111] mb-2 font-medium">{currentProject.name}</div>
                <p className="text-xs text-[#5c5c5c] leading-relaxed bg-white/50 p-3 rounded-xl border border-black/5">
                  {currentProject.description || 'No description provided.'}
                </p>
              </div>
              <div className="frosted-panel rounded-[24px] p-5 shadow-sm">
                <h3 className="text-[10px] font-bold tracking-wider text-[#5c5c5c] mb-4 flex items-center gap-2">
                  <Check size={12} /> RECENT ACTIVITY
                </h3>
                <div className="relative pl-4 flex flex-col gap-5 border-l-[2px] border-black/10 ml-2 mt-2">
                  <div className="relative flex items-start gap-3">
                    <div className="absolute -left-[24px] top-0 bg-white p-1 rounded-full border shadow-sm">
                      <Play size={10} className="text-[#111111]" />
                    </div>
                    <div className="flex flex-col pt-0.5">
                      <span className="text-[13px] font-medium text-[#111111]">Project created</span>
                      <span className="text-[10px] text-[#5c5c5c] mt-0.5">{new Date(currentProject.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  {currentProject.updatedAt > currentProject.createdAt && (
                    <div className="relative flex items-start gap-3">
                      <div className="absolute -left-[24px] top-0 bg-white p-1 rounded-full border shadow-sm">
                        <Edit2 size={10} className="text-[#111111]" />
                      </div>
                      <div className="flex flex-col pt-0.5">
                        <span className="text-[13px] font-medium text-[#111111]">Project updated</span>
                        <span className="text-[10px] text-[#5c5c5c] mt-0.5">{new Date(currentProject.updatedAt).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [preAuthView, setPreAuthView] = useState<'landing' | 'auth'>('landing');
  const [view, setView] = useState<'new-project' | 'workspace'>('workspace');
  const [projects, setProjects] = useState<any[]>([]);
  const [currentProject, setCurrentProject] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthChecked(true);
    });
    return () => unsubscribe();
  }, []);

  const hasAutoCreatedRef = useRef(false);

  useEffect(() => {
    if (!user) return;
    const projectsRef = collection(db, 'artifacts', APP_ID, 'users', user.uid, 'projects');
    const unsubscribe = onSnapshot(projectsRef, async (snapshot) => {
      const fetchedProjects = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => b.createdAt - a.createdAt);

      // Brand-new user with no projects yet: create one quietly so they
      // land straight in the chat, instead of an empty "no project"
      // screen or a form they have to fill out first. They can still
      // create additional projects any time via the sidebar's + button.
      if (fetchedProjects.length === 0 && !hasAutoCreatedRef.current) {
        hasAutoCreatedRef.current = true;
        try {
          await addDoc(projectsRef, {
            name: 'Untitled project',
            description: '',
            phase: 0,
            percent: 0,
            openIssues: 0,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
        } catch (err) {
          console.error('Failed to auto-create first project', err);
        }
        return; // the onSnapshot listener will fire again with the new project
      }

      setProjects(fetchedProjects);
      setCurrentProject((prev: any) => {
        if (!prev && fetchedProjects.length > 0) return fetchedProjects[0];
        if (prev) return fetchedProjects.find((p) => p.id === prev.id) || null;
        return prev;
      });
    }, (error) => console.error('Error fetching projects', error));
    return () => unsubscribe();
  }, [user]);

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="animate-spin text-white" size={28} />
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <GlobalStyles />
        {preAuthView === 'landing' ? (
          <LandingPage onEnter={() => setPreAuthView('auth')} />
        ) : (
          <AuthScreen onAuthed={() => {}} />
        )}
      </>
    );
  }

  return (
    <>
      <GlobalStyles />
      <div className="relative w-full h-screen overflow-hidden font-poppins">
        <video
          autoPlay muted loop playsInline preload="auto" poster={JUNGLEMIND_POSTER}
          className="absolute inset-0 w-full h-full object-cover z-0"
          src={JUNGLEMIND_VIDEO}
        />
        <div className="absolute inset-0 bg-[#eef2ee]/70 z-0" />

        {view === 'new-project' && (
          <NewProjectScreen
            user={user}
            onProjectCreated={(project) => { setCurrentProject(project); setView('workspace'); }}
            onCancel={() => setView('workspace')}
          />
        )}
        {view === 'workspace' && (
          <WorkspaceChatLayout
            user={user}
            projects={projects}
            currentProject={currentProject}
            setCurrentProject={setCurrentProject}
            onNewProject={() => setView('new-project')}
          />
        )}
      </div>
    </>
  );
}
