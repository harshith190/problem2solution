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
