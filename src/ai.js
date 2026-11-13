// AI + MATCHING (frontend side)
// Part 1: instant skill matching (no AI) — guesses skills from the problem and ranks people.
// Part 2: cleans up Gemini's answer into the shape the pages need.
// Part 3: calls OUR backend (backend/server.js), which talks to Gemini. The API key never reaches the browser.

// ===================== PART 1: INSTANT MATCHING =====================
// Instant, AI-free skill matching.
// 1. extractSkillsFromText(): reads a problem / search query and guesses the skills needed.
// 2. scorePeople(): ranks database profiles by how well their skills cover those needs.
// Gemini later refines the analysis, but people appear immediately thanks to this file.

// Different spellings of the same skill → one canonical name
const ALIASES = {
  'reactjs': 'react', 'react.js': 'react', 'nextjs': 'next.js', 'next': 'next.js',
  'node': 'node.js', 'nodejs': 'node.js', 'express.js': 'express', 'expressjs': 'express',
  'js': 'javascript', 'ts': 'typescript', 'html': 'html/css', 'css': 'html/css',
  'ui': 'ui/ux', 'ux': 'ui/ux', 'ui ux': 'ui/ux', 'ui/ux design': 'ui/ux', 'ux design': 'ui/ux',
  'api': 'rest apis', 'apis': 'rest apis', 'api design': 'rest apis', 'rest api': 'rest apis',
  'postgres': 'postgresql', 'ml': 'machine learning', 'ai': 'machine learning',
  'dl': 'deep learning', 'nlp': 'natural language processing',
  'k8s': 'kubernetes', 'gcp': 'google cloud', 'seo optimization': 'seo',
  'social media': 'social media marketing', 'smm': 'social media marketing',
  'photoshop': 'adobe photoshop', 'illustrator': 'adobe illustrator',
  'android development': 'android', 'ios development': 'ios',
  'mobile app development': 'flutter', 'mobile app': 'flutter',
  'payment gateway': 'payment integration', 'payment gateway integration': 'payment integration',
  'payments': 'payment integration', 'upi': 'payment integration',
  'database design': 'postgresql', 'database': 'postgresql', 'sql database': 'sql',
  'cloud': 'aws', 'hosting': 'aws', 'esp8266': 'esp32', 'microcontroller': 'arduino',
  'data analysis': 'data analytics', 'analytics': 'data analytics',
  'tally erp': 'tally', 'e-commerce': 'ecommerce', 'e commerce': 'ecommerce'
};

// Skills that count as covering each other (partial credit)
const RELATED = {
  'payment integration': ['razorpay', 'stripe'],
  'ecommerce': ['shopify', 'woocommerce', 'razorpay', 'next.js'],
  'react': ['next.js', 'react native'],
  'flutter': ['android', 'ios', 'react native', 'kotlin', 'swift'],
  'machine learning': ['tensorflow', 'scikit-learn', 'deep learning', 'llms', 'computer vision'],
  'llms': ['gemini api', 'openai api', 'langchain', 'chatbots'],
  'iot': ['esp32', 'arduino', 'raspberry pi', 'sensors', 'mqtt'],
  'sensors': ['esp32', 'arduino', 'iot'],
  'postgresql': ['supabase', 'mysql', 'sql', 'mongodb'],
  'node.js': ['express'],
  'rest apis': ['node.js', 'express', 'fastapi', 'django', 'spring boot'],
  'ui/ux': ['figma', 'wireframing', 'prototyping'],
  'digital marketing': ['social media marketing', 'seo', 'google ads', 'meta ads', 'instagram marketing'],
  'graphic design': ['branding', 'logo design', 'canva', 'adobe photoshop', 'adobe illustrator'],
  'aws': ['azure', 'docker', 'serverless'],
  'data analytics': ['power bi', 'sql', 'excel', 'data visualization'],
  'inventory management': ['erpnext', 'odoo', 'pos systems']
};

export function normSkill(s) {
  const k = String(s || '').toLowerCase().trim().replace(/\s+/g, ' ');
  return ALIASES[k] || k;
}

// Keyword → skills rules used to read a plain-English problem
const RULES = [
  { k: ['website', 'web app', 'webapp', 'web site', 'portal', 'landing page', 'online platform', 'web platform'], s: ['React', 'Node.js', 'UI/UX', 'REST APIs', 'PostgreSQL'] },
  { k: ['online store', 'ecommerce', 'e-commerce', 'sell online', 'sell products', 'shop', 'store', 'cart', 'order online', 'place orders', 'orders', 'catalog', 'catalogue', 'products'], s: ['Ecommerce', 'React', 'Payment Integration', 'PostgreSQL'] },
  { k: ['payment', 'pay online', 'upi', 'checkout', 'razorpay', 'stripe', 'billing'], s: ['Payment Integration'] },
  { k: ['booking', 'appointment', 'schedule', 'reservation', 'book '], s: ['Node.js', 'REST APIs', 'PostgreSQL'] },
  { k: ['mobile app', 'android', 'ios', 'app for', 'smartphone', 'phone app'], s: ['Flutter', 'Firebase', 'UI/UX'] },
  { k: ['marketing', 'promote', 'promotion', 'more customers', 'reach customers', 'advertis', 'brand awareness'], s: ['Digital Marketing', 'Social Media Marketing', 'SEO'] },
  { k: ['instagram', 'facebook', 'social media', 'reels', 'youtube'], s: ['Social Media Marketing', 'Content Creation', 'Video Editing'] },
  { k: ['seo', 'google search', 'rank on google'], s: ['SEO', 'Content Writing'] },
  { k: ['logo', 'brand', 'branding', 'poster', 'flyer', 'banner'], s: ['Graphic Design', 'Branding'] },
  { k: ['design', 'mockup', 'wireframe', 'user experience'], s: ['UI/UX', 'Figma'] },
  { k: ['photo', 'photography', 'images of products'], s: ['Product Photography'] },
  { k: ['video', 'promo video', 'advertisement video'], s: ['Video Editing'] },
  { k: ['content', 'blog', 'articles', 'write'], s: ['Content Writing', 'Copywriting'] },
  { k: ['iot', 'sensor', 'monitoring device', 'smart device', 'real-time monitor', 'automation', 'embedded'], s: ['IoT', 'ESP32', 'Sensors', 'Embedded C'] },
  { k: ['farm', 'farmer', 'crop', 'irrigation', 'soil', 'agri'], s: ['IoT', 'Sensors', 'Agriculture', 'ESP32'] },
  { k: ['water', 'air quality', 'pollution', 'aqi', 'smog'], s: ['Sensors', 'IoT', 'Data Analytics'] },
  { k: ['solar', 'electricity', 'energy', 'power usage'], s: ['Solar Systems', 'IoT', 'Energy Monitoring'] },
  { k: ['chatbot', 'chat bot', 'ai assistant', 'gemini', 'gpt', 'llm', 'whatsapp bot'], s: ['LLMs', 'Python', 'Chatbots'] },
  { k: ['predict', 'recommendation', 'machine learning', 'artificial intelligence', ' ai ', 'detect', 'classif'], s: ['Machine Learning', 'Python'] },
  { k: ['image', 'camera', 'vision', 'face', 'object detection', 'segregation'], s: ['Computer Vision', 'Python', 'Machine Learning'] },
  { k: ['data', 'report', 'dashboard', 'analytics', 'insights', 'excel'], s: ['Data Analytics', 'Power BI', 'SQL'] },
  { k: ['secure', 'security', 'hack', 'fraud', 'privacy'], s: ['Network Security', 'Ethical Hacking'] },
  { k: ['inventory', 'stock', 'warehouse', 'pos', 'point of sale', 'erp'], s: ['Inventory Management', 'POS Systems', 'ERPNext'] },
  { k: ['gst', 'tax', 'accounts', 'accounting', 'invoice', 'bookkeeping'], s: ['Accounting', 'GST', 'Tally'] },
  { k: ['delivery', 'logistics', 'courier', 'shipping', 'supply chain'], s: ['Delivery Operations', 'Supply Chain'] },
  { k: ['interior', 'painting', 'paint', 'home decor', 'renovation', 'construction', 'contractor'], s: ['Interior Design', 'AutoCAD'] },
  { k: ['hospital', 'clinic', 'doctor', 'patient', 'health', 'medicine', 'telemedicine'], s: ['Telemedicine', 'React Native', 'Firebase'] },
  { k: ['school', 'student', 'education', 'course', 'learning platform', 'tuition'], s: ['React', 'Node.js', 'UI/UX', 'Video Editing'] },
  { k: ['game', 'gaming'], s: ['Unity', 'C#', 'Game Design'] },
  { k: ['ar ', 'vr', 'virtual reality', 'augmented', '3d'], s: ['Unity', 'Blender', '3D Modeling'] },
  { k: ['robot', 'drone'], s: ['Robotics', 'ROS', 'Python'] },
  { k: ['cctv', 'network', 'wifi', 'it support'], s: ['Networking', 'CCTV Installation'] },
  { k: ['blockchain', 'crypto', 'nft', 'web3'], s: ['Solidity', 'Smart Contracts'] },
  { k: ['deploy', 'server', 'scale', 'hosting', 'cloud'], s: ['AWS', 'Docker'] },
  { k: ['testing', 'bugs', 'quality check'], s: ['Manual Testing', 'Selenium'] },
  { k: ['customer support', 'crm', 'leads', 'enquiries', 'whatsapp'], s: ['CRM', 'WhatsApp Business API'] }
];

// Skills that are the core of a request (marked critical when present)
const CORE = new Set(['react', 'node.js', 'flutter', 'iot', 'esp32', 'machine learning', 'ecommerce', 'payment integration', 'llms', 'computer vision', 'digital marketing', 'unity', 'robotics', 'solidity', 'interior design', 'telemedicine']);

export function extractSkillsFromText(text) {
  const t = ` ${String(text || '').toLowerCase()} `;
  const found = new Map();
  for (const rule of RULES) {
    if (rule.k.some(k => t.includes(k))) {
      for (const s of rule.s) if (!found.has(normSkill(s))) found.set(normSkill(s), s);
    }
  }
  return [...found.values()].slice(0, 10).map(name => ({ name, critical: CORE.has(normSkill(name)) }));
}

// How strongly one person's skill list covers one required skill (1 = exact, 0.5 = related, 0 = none)
function coverage(required, personSkillSet) {
  const r = normSkill(required);
  if (personSkillSet.has(r)) return 1;
  for (const ps of personSkillSet) {
    if (ps.length > 2 && r.length > 2 && (ps.includes(r) || r.includes(ps))) return 0.8;
  }
  const rel = RELATED[r] || [];
  if (rel.some(x => personSkillSet.has(x))) return 0.6;
  // reverse relation: person has the parent skill of a required child skill
  for (const [parent, kids] of Object.entries(RELATED)) {
    if (kids.includes(r) && personSkillSet.has(parent)) return 0.5;
  }
  return 0;
}

const toSkillArr = s => (Array.isArray(s) ? s : String(s || '').split(',')).map(x => x.trim()).filter(Boolean);

// Returns people sorted by score, each with { match, matchedSkills, matchReason }
export function scorePeople(skillsNeeded, people) {
  const req = (skillsNeeded || []).map(s => (typeof s === 'string' ? { name: s, critical: false } : s)).filter(s => s?.name);
  if (!req.length) return [];
  const maxWeight = req.reduce((sum, s) => sum + (s.critical ? 2 : 1), 0);
  // one person is not expected to cover a whole project: covering ~5 weight units = top score
  const target = Math.min(maxWeight, 5);

  return (people || [])
    .map(p => {
      const skills = toSkillArr(p.skills);
      const set = new Set(skills.map(normSkill));
      let got = 0;
      const matched = [];
      for (const s of req) {
        const c = coverage(s.name, set);
        if (c > 0) {
          got += c * (s.critical ? 2 : 1);
          matched.push(s.name);
        }
      }
      // role keyword bonus (e.g. "Frontend Developer" for a React need)
      const role = String(p.role || '').toLowerCase();
      const roleHit = req.some(s => role.includes(normSkill(s.name).split(/[ ./]/)[0]));
      const ratio = Math.min(1, got / target);
      const score = matched.length ? Math.min(98, Math.round(52 + ratio * 42 + (roleHit ? 4 : 0))) : 0;
      return {
        ...p,
        match: score,
        matchedSkills: matched,
        matchReason: matched.length ? `Has ${matched.slice(0, 4).join(', ')}${matched.length > 4 ? '…' : ''} needed for this project.` : ''
      };
    })
    .filter(p => p.match > 0)
    .sort((a, b) => b.match - a.match);
}

// Smart people search for the Directory: text match + skill understanding
export function searchPeople(query, people) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return people;
  const STOP = new Set(['a', 'an', 'the', 'for', 'my', 'me', 'i', 'to', 'of', 'and', 'or', 'in', 'on', 'with', 'want', 'need', 'someone', 'who', 'can', 'build', 'make', 'help', 'get', 'our', 'we', 'is', 'it', 'from', 'person', 'people']);
  const words = q.split(/[\s,]+/).filter(w => w.length > 1 && !STOP.has(w));
  const inferred = extractSkillsFromText(q);
  const scored = scorePeople(inferred.length ? inferred : words.map(w => ({ name: w })), people);
  const byName = new Map(scored.map(p => [p.id || p.name, p]));

  const results = people
    .map(p => {
      const hay = `${p.name} ${p.role} ${toSkillArr(p.skills).join(' ')} ${p.bio || ''}`.toLowerCase();
      const textHits = words.filter(w => hay.includes(w)).length;
      const skillScore = byName.get(p.id || p.name)?.match || 0;
      const rank = textHits * 30 + skillScore;
      return { ...p, _rank: rank, matchedSkills: byName.get(p.id || p.name)?.matchedSkills || [] };
    })
    .filter(p => p._rank > 0)
    .sort((a, b) => b._rank - a._rank);
  // keep only clearly relevant people (at least half as relevant as the best match)
  const top = results[0]?._rank || 0;
  return results.filter(p => p._rank >= top * 0.5);
}

// Quick analysis shown instantly while Gemini is thinking (or if Gemini fails)
export function quickAnalysis(problemText, people) {
  let skillsNeeded = extractSkillsFromText(problemText);
  if (!skillsNeeded.length) skillsNeeded = [{ name: 'React', critical: true }, { name: 'Node.js', critical: true }, { name: 'UI/UX', critical: false }];
  const ranked = scorePeople(skillsNeeded, people);
  const coveredSet = new Set(ranked.flatMap(p => p.matchedSkills.map(normSkill)));
  const coveredSkills = skillsNeeded.map(s => s.name).filter(n => coveredSet.has(normSkill(n)));
  const missingSkills = skillsNeeded.map(s => s.name).filter(n => !coveredSet.has(normSkill(n)));
  const firstLine = String(problemText || '').split(/[.!?\n]/)[0].trim();
  return {
    isQuick: true,
    title: firstLine.length > 60 ? firstLine.slice(0, 57) + '…' : firstLine || 'New project',
    domain: '…',
    difficulty: '…',
    impact: '…',
    estimatedCost: '…',
    timeline: '…',
    skillsNeeded,
    solution: { title: 'Preparing solution…', description: '', architecture: [] },
    skillGap: {
      coveredSkills,
      missingSkills,
      summary: missingSkills.length
        ? `Nobody in the database covers ${missingSkills.join(', ')} yet.`
        : 'People in the database cover every skill this project needs.'
    },
    matchedPeople: ranked.slice(0, 8).map(p => ({ name: p.name, role: p.role, matchScore: p.match, matchReason: p.matchReason })),
    nextTasks: []
  };
}

// ===================== PART 2: CLEAN UP AI ANSWER =====================
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

// ===================== PART 3: CALLS TO OUR BACKEND =====================
// All Gemini calls go through our own backend (server.js), so the API key never reaches the browser.



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
