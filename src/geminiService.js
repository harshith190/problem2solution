// All Gemini calls go through our own backend (server.js), so the API key never reaches the browser.
import { normalizeAnalysis } from './normalizeAnalysis.js';
import { quickAnalysis, scorePeople, extractSkillsFromText } from './matching.js';

// Optional personal key typed into the Dashboard (kept only in this browser, sent to OUR backend)
export function getGeminiKey() {
  try {
    return (localStorage.getItem('p2s_gemini_api_key') || '').trim();
  } catch {
    return '';
  }
}

export function saveGeminiKey(key) {
  try {
    if (key && key.trim()) localStorage.setItem('p2s_gemini_api_key', key.trim());
    else localStorage.removeItem('p2s_gemini_api_key');
  } catch { /* storage unavailable */ }
}

function headers() {
  const h = { 'Content-Type': 'application/json' };
  const key = getGeminiKey();
  if (key) h['x-gemini-api-key'] = key;
  return h;
}

async function postJSON(url, body, timeoutMs) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { method: 'POST', headers: headers(), body: JSON.stringify(body), signal: ctrl.signal });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Server error ${res.status}`);
    return data;
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('The AI took too long to respond.');
    if (err instanceof TypeError) throw new Error('Backend is not running. Start it with start-backend.bat or "npm run server".');
    throw err;
  } finally {
    clearTimeout(t);
  }
}

export async function testGeminiApiKey(keyToTest) {
  if (keyToTest !== undefined) saveGeminiKey(keyToTest);
  try {
    const data = await postJSON('/api/ai/test', {}, 20000);
    return { success: true, message: `Connected! (${data.model})` };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

// Instant local result (no AI) — shown immediately while Gemini works
export function getQuickAnalysis(problemText, talentPool = []) {
  return quickAnalysis(problemText, talentPool);
}

// Full Gemini analysis. Only the most relevant people are sent, which keeps the request small and fast.
export async function analyzeProblemWithAI(problemText, talentPool = []) {
  const guessed = extractSkillsFromText(problemText);
  const shortlist = scorePeople(guessed, talentPool).slice(0, 12);
  // make sure Gemini still sees some variety if the keyword guess was narrow
  const pool = shortlist.length >= 6
    ? shortlist
    : [...shortlist, ...talentPool.filter(p => !shortlist.some(s => s.name === p.name)).slice(0, 12 - shortlist.length)];

  try {
    const data = await postJSON('/api/ai/analyze', {
      problem: problemText,
      talentPool: pool.map(p => ({ name: p.name, role: p.role, skills: p.skills }))
    }, 60000);
    const normalized = normalizeAnalysis(data.data);
    if (!normalized) throw new Error('AI reply could not be read.');
    return { success: true, isAI: true, model: data.model, ...mergeWithLocalScores(normalized, talentPool) };
  } catch (err) {
    console.warn('AI analysis failed, using quick analysis:', err.message);
    return { ...quickAnalysis(problemText, talentPool), isQuick: false, isAI: false, aiError: err.message };
  }
}

// Combine Gemini's opinion with our own skill scoring so every database person gets a fair, consistent score
function mergeWithLocalScores(ai, talentPool) {
  const local = scorePeople(ai.skillsNeeded, talentPool);
  const localByName = new Map(local.map(p => [p.name.toLowerCase(), p]));
  const aiByName = new Map(ai.matchedPeople.map(p => [p.name.toLowerCase(), p]));

  const names = new Set([...aiByName.keys(), ...localByName.keys()]);
  const merged = [...names]
    .map(n => {
      const a = aiByName.get(n);
      const l = localByName.get(n);
      const person = talentPool.find(p => p.name.toLowerCase() === n);
      if (!person) return null; // ignore names Gemini invented
      const score = a && l ? Math.round(a.matchScore * 0.6 + l.match * 0.4) : a ? a.matchScore : l.match;
      return {
        name: person.name,
        role: person.role,
        matchScore: Math.min(98, score),
        matchReason: a?.matchReason || l?.matchReason || ''
      };
    })
    .filter(Boolean)
    .sort((x, y) => y.matchScore - x.matchScore);

  return { ...ai, matchedPeople: merged };
}

// Project assistant chat
export async function askProjectAssistant(message, projectContext) {
  try {
    const data = await postJSON('/api/ai/chat', { message, projectContext }, 45000);
    return data.reply || 'No reply received.';
  } catch (err) {
    return `⚠️ ${err.message}`;
  }
}
