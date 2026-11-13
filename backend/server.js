// BACKEND (Node + Express, port 5000): receives requests from the website and talks to Gemini AI.
// Routes: GET /api/health, POST /api/ai/test, POST /api/ai/analyze, POST /api/ai/chat
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { normalizeAnalysis } from '../src/ai.js';

dotenv.config();

// ---- The exact shape of the answer we ask Gemini to return ----
// Gemini structured-output schema (OpenAPI style, used with config.responseSchema).
// Shared by server.js and geminiService.js.
export const ANALYSIS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    domain: { type: Type.STRING },
    difficulty: { type: Type.STRING },
    impact: { type: Type.STRING },
    estimatedCost: { type: Type.STRING },
    timeline: { type: Type.STRING },
    skillsNeeded: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          critical: { type: Type.BOOLEAN }
        },
        required: ['name', 'critical']
      }
    },
    solution: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        description: { type: Type.STRING },
        architecture: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      },
      required: ['title', 'description', 'architecture']
    },
    skillGap: {
      type: Type.OBJECT,
      properties: {
        coveredSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
        missingSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
        summary: { type: Type.STRING }
      },
      required: ['coveredSkills', 'missingSkills', 'summary']
    },
    matchedPeople: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          matchScore: { type: Type.INTEGER },
          matchReason: { type: Type.STRING },
          role: { type: Type.STRING }
        },
        required: ['name', 'matchScore', 'matchReason']
      }
    },
    nextTasks: {
      type: Type.ARRAY,
      items: { type: Type.STRING }
    }
  },
  required: [
    'title', 'domain', 'difficulty', 'impact', 'estimatedCost',
    'timeline', 'skillsNeeded', 'solution', 'skillGap', 'matchedPeople', 'nextTasks'
  ]
};

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Fastest model first; the bigger model is the backup.
const MODELS = [
  { name: 'gemini-3.5-flash-lite', timeoutMs: 20000 },
  { name: 'gemini-3.8-flash', timeoutMs: 30000 }
];

app.use(cors({ origin: [FRONTEND_URL, /^http:\/\/localhost:\d+$/] }));
app.use(express.json({ limit: '200kb' }));

// Key comes from .env on the server. A key typed in the Dashboard (sent as a header) can override it.
function getGeminiKey(req) {
  return (
    req.headers['x-gemini-api-key'] ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.VITE_GEMINI_API_KEY || // legacy name — please rename to GEMINI_API_KEY in .env
    ''
  );
}

function withTimeout(promise, ms, label) {
  let t;
  const timeout = new Promise((_, reject) => {
    t = setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(t));
}

// Errors that will not be fixed by trying another model (bad key, quota, bad request)
function isFatal(err) {
  const msg = String(err?.message || '');
  return /API key not valid|API_KEY_INVALID|PERMISSION_DENIED|"code":\s*(400|401|403)/i.test(msg);
}

// Try each model in order until one answers
async function generate(apiKey, contents, config = {}) {
  const ai = new GoogleGenAI({ apiKey });
  let lastErr;
  for (const m of MODELS) {
    try {
      const t0 = Date.now();
      const response = await withTimeout(
        ai.models.generateContent({ model: m.name, contents, config }),
        m.timeoutMs,
        m.name
      );
      console.log(`[gemini] ${m.name} answered in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
      return { response, model: m.name };
    } catch (err) {
      lastErr = err;
      console.warn(`[gemini] ${m.name} failed: ${String(err.message).slice(0, 160)}`);
      if (isFatal(err)) break;
    }
  }
  throw lastErr;
}

function friendlyError(err) {
  const msg = String(err?.message || '');
  if (/API key not valid|API_KEY_INVALID/i.test(msg)) return 'The AI API key is invalid. Check GEMINI_API_KEY in .env.';
  if (/quota|RESOURCE_EXHAUSTED|429/i.test(msg)) return 'AI usage limit reached. Wait a minute and try again.';
  if (/timed out|503|UNAVAILABLE|overloaded|high demand/i.test(msg)) return 'The AI is busy right now. Please try again in a moment.';
  return msg || 'AI request failed.';
}

// Root: send browser visitors to the frontend
app.get('/', (req, res) => {
  if (req.accepts('html')) return res.redirect(FRONTEND_URL);
  res.json({
    status: 'online',
    message: 'Problem2Solution Backend API',
    frontend: FRONTEND_URL,
    endpoints: ['/api/health', '/api/ai/test', '/api/ai/analyze', '/api/ai/chat']
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    hasGeminiKey: Boolean(getGeminiKey(req)),
    models: MODELS.map(m => m.name),
    timestamp: new Date().toISOString()
  });
});

// Quick check that the key works
app.post('/api/ai/test', async (req, res) => {
  const apiKey = getGeminiKey(req);
  if (!apiKey) return res.status(400).json({ error: 'No AI API key set. Add GEMINI_API_KEY to .env.' });
  try {
    const { model } = await generate(apiKey, 'Reply with the single word: OK');
    res.json({ success: true, model });
  } catch (err) {
    res.status(502).json({ error: friendlyError(err) });
  }
});

// Problem analysis + talent matchmaking
app.post('/api/ai/analyze', async (req, res) => {
  const { problem, talentPool } = req.body || {};
  const apiKey = getGeminiKey(req);

  if (!problem || !String(problem).trim()) {
    return res.status(400).json({ error: 'Problem description is required.' });
  }
  if (!apiKey) {
    return res.status(400).json({ error: 'AI API key is not configured. Add GEMINI_API_KEY to .env.' });
  }

  const pool = Array.isArray(talentPool) ? talentPool.slice(0, 15) : [];
  const talentListText = pool.length
    ? pool.map((p, i) => `${i + 1}. ${p.name} (${p.role}) - ${Array.isArray(p.skills) ? p.skills.join(', ') : p.skills}`).join('\n')
    : 'No profiles available; leave matchedPeople empty.';

  const prompt = `You are a solution architect and technical recruiter for Problem2Solution, a platform that turns real-world problems (often from small businesses in India) into projects and finds people to build them.

PROBLEM:
"""
${String(problem).slice(0, 3000)}
"""

PEOPLE IN OUR DATABASE:
${talentListText}

Return JSON with:
- title: short project title
- domain, difficulty (Beginner/Intermediate/Advanced), impact (Low/Medium/High)
- estimatedCost: realistic cost in INR for a first working version, e.g. "₹40,000–₹60,000"
- timeline: e.g. "4–6 weeks"
- skillsNeeded: 4-7 skills (use common names like React, Node.js, Flutter, UI/UX, SEO), critical=true for must-have skills
- solution: title, description (2 plain-English sentences a business owner understands), architecture (4-6 short steps)
- skillGap: coveredSkills (needed skills the people above have), missingSkills (needed skills nobody above has), summary (1 sentence)
- matchedPeople: the best 6 people from the list ONLY (exact names), matchScore 50-98, matchReason (1 short sentence), role
- nextTasks: 5 concrete steps to build it`;

  try {
    const { response, model } = await generate(apiKey, prompt, {
      responseMimeType: 'application/json',
      responseSchema: ANALYSIS_SCHEMA,
      temperature: 0.4
    });
    const parsed = normalizeAnalysis(response.text);
    if (!parsed) {
      console.error('[analyze] Unreadable reply:', response.text?.slice(0, 300));
      return res.status(502).json({ error: 'The AI returned a reply that could not be read. Please try again.' });
    }
    console.log(`[analyze] "${parsed.title}" via ${model}, ${parsed.matchedPeople.length} people matched`);
    res.json({ success: true, model, data: parsed });
  } catch (err) {
    console.error('[analyze] Error:', err.message);
    res.status(502).json({ error: friendlyError(err) });
  }
});

// Project assistant chat
app.post('/api/ai/chat', async (req, res) => {
  const { message, projectContext, history } = req.body || {};
  const apiKey = getGeminiKey(req);

  if (!message) return res.status(400).json({ error: 'Message is required.' });
  if (!apiKey) return res.status(400).json({ error: 'AI API key is not configured.' });

  const context = projectContext
    ? `Project: ${projectContext.title}\nDescription: ${projectContext.description || ''}\nTimeline: ${projectContext.timeline || ''}`
    : 'General Problem2Solution project help';

  const past = Array.isArray(history)
    ? history.slice(-6).map(h => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.text}`).join('\n')
    : '';

  const prompt = `You are the project assistant for this project:
${context}
${past ? `\nRecent conversation:\n${past}\n` : ''}
User: ${String(message).slice(0, 2000)}

Answer in at most 4 short sentences or bullet points. Be practical: how to build it, what to use, or how to wire it. Users are usually in India: prefer India-friendly options (Razorpay/UPI, INR prices, Indian hosting/regions) when relevant.`;

  try {
    const { response } = await generate(apiKey, prompt, { temperature: 0.5 });
    res.json({ success: true, reply: response.text });
  } catch (err) {
    console.error('[chat] Error:', err.message);
    res.status(502).json({ error: friendlyError(err) });
  }
});

app.listen(PORT, () => {
  console.log(`Backend server listening on http://localhost:${PORT}`);
});
