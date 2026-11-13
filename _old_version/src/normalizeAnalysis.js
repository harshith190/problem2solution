// Shared by server.js (Node) and geminiService.js (browser).
// Gemini sometimes wraps its JSON in an array or uses different key names
// (e.g. "categorization", "talentMatchmaking"). This maps any of those shapes
// onto the exact fields the React UI reads.

const pick = (obj, ...keys) => {
  if (!obj || typeof obj !== 'object') return undefined;
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null && obj[k] !== '') return obj[k];
  }
  // case-insensitive / space-insensitive match as a last resort
  const norm = s => String(s).toLowerCase().replace(/[\s_-]/g, '');
  const wanted = keys.map(norm);
  for (const [k, v] of Object.entries(obj)) {
    if (wanted.includes(norm(k)) && v !== undefined && v !== null && v !== '') return v;
  }
  return undefined;
};

const toStr = v => (v === undefined || v === null ? undefined : String(v));
const toArr = v => (Array.isArray(v) ? v : v ? [v] : []);

function formatCost(v) {
  if (v === undefined || v === null || v === '') return undefined;
  if (typeof v === 'number') return `₹${v.toLocaleString('en-IN')}`;
  const s = String(v);
  return /₹|rs|inr/i.test(s) ? s : `₹${s}`;
}

export function normalizeAnalysis(raw) {
  let r = raw;
  if (typeof r === 'string') {
    try { r = JSON.parse(r); } catch { return null; }
  }
  if (Array.isArray(r)) r = r[0];
  if (!r || typeof r !== 'object') return null;

  // Some replies nest the headline fields under "categorization"/"category"
  const cat = pick(r, 'categorization', 'category', 'classification') || {};
  const top = (...keys) => pick(r, ...keys) ?? pick(cat, ...keys);

  const skillsRaw = toArr(pick(r, 'skillsNeeded', 'skills', 'requiredSkills'));
  const skillsNeeded = skillsRaw.map(s => {
    if (typeof s === 'string') return { name: s, critical: false };
    const name = toStr(pick(s, 'name', 'skill', 'title')) || 'Skill';
    const c = pick(s, 'critical', 'type', 'priority', 'importance');
    const critical = typeof c === 'boolean' ? c : /critical|high|must/i.test(String(c ?? ''));
    return { name, critical };
  });

  const solRaw = pick(r, 'solution', 'recommendedSolution') || {};
  const solution = {
    title: toStr(pick(solRaw, 'title', 'solutionTitle', 'name')) || 'Recommended solution',
    description: toStr(pick(solRaw, 'description', 'technicalSummary', 'technical summary', 'summary')) || '',
    architecture: toArr(pick(solRaw, 'architecture', 'architecturePipeline', 'pipeline', 'steps')).map(String)
  };

  const gapRaw = pick(r, 'skillGap', 'skillsGap', 'gap') || {};
  const skillGap = {
    coveredSkills: toArr(pick(gapRaw, 'coveredSkills', 'covered', 'availableSkills')).map(String),
    missingSkills: toArr(pick(gapRaw, 'missingSkills', 'missing', 'gaps')).map(String),
    summary: toStr(pick(gapRaw, 'summary', 'biggestGap', 'explanation')) || ''
  };

  if (!skillGap.coveredSkills.length && skillsNeeded.length) {
    const missing = skillGap.missingSkills.map(s => s.toLowerCase());
    skillGap.coveredSkills = skillsNeeded.map(s => s.name).filter(n => !missing.includes(n.toLowerCase()));
  }

  const peopleRaw = toArr(pick(r, 'matchedPeople', 'talentMatchmaking', 'talentMatches', 'matches', 'team'));
  const seen = new Set();
  const matchedPeople = peopleRaw
    .map(p => ({
      // strip "(Frontend Developer)" style suffixes Gemini adds for duplicate names
      name: String(pick(p, 'name', 'fullName') || '').replace(/\s*\(.*\)\s*$/, '').trim(),
      role: toStr(pick(p, 'role', 'title')),
      matchScore: Math.round(Number(pick(p, 'matchScore', 'score', 'match')) || 0),
      matchReason: toStr(pick(p, 'matchReason', 'reason', 'why')) || ''
    }))
    .filter(p => p.name && !seen.has(p.name.toLowerCase()) && seen.add(p.name.toLowerCase()))
    .sort((a, b) => b.matchScore - a.matchScore);

  const nextTasks = toArr(pick(r, 'nextTasks', 'tasks', 'milestones', 'nextSteps')).map(t =>
    typeof t === 'string' ? t : toStr(pick(t, 'task', 'title', 'description')) || JSON.stringify(t)
  );

  return {
    title: toStr(top('title', 'problemTitle')) || solution.title,
    domain: toStr(top('domain', 'Domain')) || 'General',
    difficulty: toStr(top('difficulty', 'Difficulty')) || 'Intermediate',
    impact: toStr(top('impact', 'Impact')) || 'Medium',
    estimatedCost: formatCost(top('estimatedCost', 'estimatedPrototypeCostINR', 'cost', 'budget')) || '—',
    timeline: toStr(top('timeline', 'Timeline')) || '—',
    skillsNeeded,
    solution,
    skillGap,
    matchedPeople,
    nextTasks
  };
}
