// DATABASE: everything that talks to Supabase — connection, login/signup/logout,
// and get/add/delete for problems, people, projects, teams, works and messages.
// If Supabase is not connected, it falls back to browser local storage.

import { createClient } from '@supabase/supabase-js';
import { PEOPLE } from './peopleSeed.js';

// Local ids (like "1715000000000") are not valid UUIDs, so never send them to Supabase
const forDb = ({ id, ...rest }) => (id && /^[0-9a-f-]{36}$/i.test(String(id)) ? { id, ...rest } : rest);

// Default initial seed data for offline / fallback mode
// Offline fallback uses the same people as the database seed
export const initialProfiles = PEOPLE.map((p, i) => ({ id: String(i + 1), ...p }));

export const initialProblems = [
  {
    id: '1',
    title: 'Smart irrigation for small farms',
    description: "Farmers waste water because they don't know when crops need irrigation.",
    domain: 'Agriculture · IoT',
    skills: ['IoT', 'ESP32', 'Embedded C', 'React', 'Backend'],
    budget: '₹1,200',
    timeline: '4 weeks',
    target_users: 'Small-scale farmers'
  },
  {
    id: '2',
    title: 'Affordable water monitoring for villages',
    description: 'Rural communities lack real-time water quality and contamination testing.',
    domain: 'Water',
    skills: ['Water Quality Sensors', 'Telemetry', 'React', 'Node.js'],
    budget: '₹2,500',
    timeline: '6 weeks',
    target_users: 'Rural village councils'
  },
  {
    id: '3',
    title: 'Waste segregation in residential areas',
    description: 'Manual garbage separation is inefficient and causes recycling failures.',
    domain: 'Environment',
    skills: ['Computer Vision', 'Python', 'Hardware', 'Mobile App'],
    budget: '₹3,500',
    timeline: '8 weeks',
    target_users: 'Residential apartments'
  },
  {
    id: '4',
    title: 'Low-cost air quality monitoring',
    description: 'Urban neighborhoods lack localized AQI measurement nodes for smog tracking.',
    domain: 'Smart City',
    skills: ['AQI Sensors', 'ESP8266', 'Dashboard UI', 'Data Analytics'],
    budget: '₹1,800',
    timeline: '4 weeks',
    target_users: 'Urban communities'
  }
];

export const initialProjects = [
  {
    id: '1',
    title: 'Smart irrigation monitoring',
    description: 'Build a low-cost irrigation monitoring system using soil-moisture sensors, ESP32 and a cloud dashboard.',
    domain: 'Agriculture · IoT',
    skills: ['ESP32', 'Soil Sensors', 'Supabase', 'React'],
    budget: '₹1,200',
    timeline: '4 weeks',
    progress: 35
  }
];

// Helper to get active credentials (env vars or localStorage)
export function getCredentials() {
  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const localUrl = localStorage.getItem('p2s_supabase_url');
  const localKey = localStorage.getItem('p2s_supabase_anon_key');

  const url = (localUrl && localUrl.trim()) || (envUrl && envUrl.trim()) || '';
  const key = (localKey && localKey.trim()) || (envKey && envKey.trim()) || '';
  const isConfigured = Boolean(url && key && url.startsWith('http'));

  return { url, key, isConfigured };
}

let supabaseInstance = null;
let currentUrl = '';
let currentKey = '';

export function getSupabase() {
  const { url, key, isConfigured } = getCredentials();
  if (!isConfigured) return null;

  if (!supabaseInstance || currentUrl !== url || currentKey !== key) {
    try {
      supabaseInstance = createClient(url, key);
      currentUrl = url;
      currentKey = key;
    } catch (err) {
      console.warn('Failed to initialize Supabase client:', err);
      return null;
    }
  }
  return supabaseInstance;
}

export function saveCredentials(url, key) {
  if (url) localStorage.setItem('p2s_supabase_url', url.trim());
  else localStorage.removeItem('p2s_supabase_url');

  if (key) localStorage.setItem('p2s_supabase_anon_key', key.trim());
  else localStorage.removeItem('p2s_supabase_anon_key');

  supabaseInstance = null;
  return getSupabase();
}

export async function testConnection() {
  const client = getSupabase();
  if (!client) {
    return { success: false, message: 'Supabase URL or Anon Key is missing or invalid.' };
  }
  try {
    const { error } = await client.from('profiles').select('id').limit(1);
    if (error) {
      return {
        success: false,
        message: `Connected to Supabase, but query returned error: ${error.message}. (Did you execute supabase_schema.sql in the SQL Editor?)`
      };
    }
    return { success: true, message: 'Successfully connected to Supabase backend!' };
  } catch (err) {
    return { success: false, message: `Connection error: ${err.message}` };
  }
}

// ----------------- AUTHENTICATION API (SUPABASE AUTH) -----------------

export async function apiSignIn(email, password) {
  const client = getSupabase();
  if (client) {
    try {
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) {
        return { success: false, error: error.message };
      }
      if (data?.user) {
        localStorage.setItem('p2s_auth_user', JSON.stringify(data.user));
        return { success: true, user: data.user, session: data.session };
      }
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // Offline mode (no Supabase connected): local session, never admin
  if (email && password) {
    const demoUser = {
      id: 'local-' + email,
      email: email,
      user_metadata: { name: email.split('@')[0], role: 'user' }
    };
    localStorage.setItem('p2s_auth_user', JSON.stringify(demoUser));
    return {
      success: true,
      user: demoUser,
      isDemo: true,
      message: 'Signed in using local session (Supabase cloud not connected).'
    };
  }

  return { success: false, error: 'Email and password are required.' };
}

export async function apiSignUp(email, password, { role = 'user', fullName = '' } = {}) {
  const client = getSupabase();
  if (client) {
    try {
      const { data, error } = await client.auth.signUp({
        email,
        password,
        // role is only a request: the database trigger allows 'user' or 'talent', never 'admin'
        options: { data: { role: role === 'talent' ? 'talent' : 'user', full_name: fullName } }
      });
      if (error) {
        return { success: false, error: error.message };
      }
      if (data?.user) {
        localStorage.setItem('p2s_auth_user', JSON.stringify(data.user));
        return {
          success: true,
          user: data.user,
          session: data.session,
          message: data.session ? 'Account created successfully!' : 'Sign-up initiated! Please check your email to confirm your account.'
        };
      }
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // Offline fallback (no Supabase): local account, never admin
  const demoUser = {
    id: 'local-' + Date.now(),
    email: email,
    user_metadata: { name: fullName || email.split('@')[0], role: role === 'talent' ? 'talent' : 'user' }
  };
  localStorage.setItem('p2s_auth_user', JSON.stringify(demoUser));
  return { success: true, user: demoUser, message: 'Account created in local session.' };
}

export async function apiSignOut() {
  const client = getSupabase();
  if (client) {
    try {
      await client.auth.signOut();
    } catch (e) {
      console.warn('Sign out error', e);
    }
  }
  localStorage.removeItem('p2s_auth_user');
  return true;
}

export async function apiGetCurrentUser() {
  const client = getSupabase();
  if (client) {
    try {
      const { data: { user } } = await client.auth.getUser();
      if (user) {
        localStorage.setItem('p2s_auth_user', JSON.stringify(user));
        return user;
      }
    } catch (e) {
      console.warn('Get current user error', e);
    }
  }
  try {
    const local = localStorage.getItem('p2s_auth_user');
    return local ? JSON.parse(local) : null;
  } catch {
    return null;
  }
}

// ----------------- DATA API METHODS WITH LOCAL FALLBACK -----------------

// Helper for local storage persistence
function getLocal(key, defaultVal) {
  try {
    const item = localStorage.getItem(`p2s_${key}`);
    return item ? JSON.parse(item) : defaultVal;
  } catch {
    return defaultVal;
  }
}

function setLocal(key, val) {
  try {
    localStorage.setItem(`p2s_${key}`, JSON.stringify(val));
  } catch (e) {
    console.error('Local storage set error', e);
  }
}

// 1. PROBLEMS
export async function apiGetProblems() {
  const client = getSupabase();
  if (client) {
    try {
      const { data, error } = await client.from('problems').select('*').order('created_at', { ascending: false });
      if (!error && data && data.length > 0) return data;
    } catch (e) {
      console.warn('Supabase getProblems failed, falling back to local', e);
    }
  }
  return getLocal('problems', initialProblems);
}

export async function apiAddProblem(problem) {
  const client = getSupabase();
  const newProblem = {
    id: problem.id || String(Date.now()),
    title: problem.title || 'Untitled Problem',
    description: problem.description || '',
    domain: problem.domain || 'General',
    skills: Array.isArray(problem.skills) ? problem.skills : (problem.skills ? problem.skills.split(',').map(s=>s.trim()).filter(Boolean) : []),
    budget: problem.budget || '₹1,000–₹5,000',
    timeline: problem.timeline || '4 weeks',
    target_users: problem.target_users || 'General',
    ...(problem.user_id && !String(problem.user_id).startsWith('local-') ? { user_id: problem.user_id } : {})
  };

  if (client) {
    try {
      const { data, error } = await client.from('problems').insert([forDb(newProblem)]).select().single();
      if (!error && data) {
        // Also sync local
        const local = getLocal('problems', initialProblems);
        setLocal('problems', [data, ...local]);
        return data;
      }
    } catch (e) {
      console.warn('Supabase addProblem failed, saving locally', e);
    }
  }

  const local = getLocal('problems', initialProblems);
  const updated = [newProblem, ...local];
  setLocal('problems', updated);
  return newProblem;
}

export async function apiDeleteProblem(id) {
  const client = getSupabase();
  if (client) {
    try {
      const { error, count } = await client.from('problems').delete({ count: 'exact' }).eq('id', id);
      if (error) throw new Error(error.message);
      if (count === 0 && /^[0-9a-f-]{36}$/i.test(String(id))) throw new Error('Not allowed: only an admin (or the owner) can delete this.');
    } catch (e) {
      console.warn('Supabase deleteProblem failed', e);
      throw e;
    }
  }
  const local = getLocal('problems', initialProblems);
  const updated = local.filter(p => p.id !== id);
  setLocal('problems', updated);
  return updated;
}

// 2. PROFILES / TALENT
export async function apiGetProfiles() {
  const client = getSupabase();
  if (client) {
    try {
      const { data, error } = await client.from('profiles').select('*').order('created_at', { ascending: false });
      if (!error && data && data.length > 0) return data;
    } catch (e) {
      console.warn('Supabase getProfiles failed, falling back to local', e);
    }
  }
  return getLocal('profiles', initialProfiles);
}

export async function apiAddProfile(profile) {
  const client = getSupabase();
  const initials = profile.initials || profile.name.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0, 2);
  const newProfile = {
    id: profile.id || String(Date.now()),
    name: profile.name,
    role: profile.role,
    skills: Array.isArray(profile.skills) ? profile.skills : profile.skills.split(',').map(s=>s.trim()).filter(Boolean),
    initials,
    match: Number(profile.match) || 85,
    bio: profile.bio || ''
  };

  if (client) {
    try {
      const { data, error } = await client.from('profiles').insert([forDb(newProfile)]).select().single();
      if (!error && data) {
        const local = getLocal('profiles', initialProfiles);
        setLocal('profiles', [data, ...local]);
        return data;
      }
    } catch (e) {
      console.warn('Supabase addProfile failed, saving locally', e);
    }
  }

  const local = getLocal('profiles', initialProfiles);
  const updated = [newProfile, ...local];
  setLocal('profiles', updated);
  return newProfile;
}

export async function apiDeleteProfile(id) {
  const client = getSupabase();
  if (client) {
    try {
      const { error, count } = await client.from('profiles').delete({ count: 'exact' }).eq('id', id);
      if (error) throw new Error(error.message);
      if (count === 0 && /^[0-9a-f-]{36}$/i.test(String(id))) throw new Error('Not allowed: only an admin (or the owner) can delete this.');
    } catch (e) {
      console.warn('Supabase deleteProfile failed', e);
      throw e;
    }
  }
  const local = getLocal('profiles', initialProfiles);
  const updated = local.filter(p => p.id !== id);
  setLocal('profiles', updated);
  return updated;
}

// 3. PROJECTS
export async function apiGetProjects() {
  const client = getSupabase();
  if (client) {
    try {
      const { data, error } = await client.from('projects').select('*').order('created_at', { ascending: false });
      if (!error && data && data.length > 0) return data;
    } catch (e) {
      console.warn('Supabase getProjects failed, falling back to local', e);
    }
  }
  return getLocal('projects', initialProjects);
}

export async function apiAddProject(project) {
  const client = getSupabase();
  const newProject = {
    id: project.id || String(Date.now()),
    title: project.title,
    description: project.description,
    domain: project.domain || 'Technology',
    skills: Array.isArray(project.skills) ? project.skills : (project.skills ? project.skills.split(',').map(s=>s.trim()).filter(Boolean) : []),
    budget: project.budget || '₹1,500',
    timeline: project.timeline || '4 weeks',
    progress: Number(project.progress) || 10
  };

  if (client) {
    try {
      const { data, error } = await client.from('projects').insert([forDb(newProject)]).select().single();
      if (!error && data) {
        const local = getLocal('projects', initialProjects);
        setLocal('projects', [data, ...local]);
        return data;
      }
    } catch (e) {
      console.warn('Supabase addProject failed, saving locally', e);
    }
  }

  const local = getLocal('projects', initialProjects);
  const updated = [newProject, ...local];
  setLocal('projects', updated);
  return newProject;
}

export async function apiDeleteProject(id) {
  const client = getSupabase();
  if (client) {
    try {
      const { error, count } = await client.from('projects').delete({ count: 'exact' }).eq('id', id);
      if (error) throw new Error(error.message);
      if (count === 0 && /^[0-9a-f-]{36}$/i.test(String(id))) throw new Error('Not allowed: only an admin (or the owner) can delete this.');
    } catch (e) {
      console.warn('Supabase deleteProject failed', e);
      throw e;
    }
  }
  const local = getLocal('projects', initialProjects);
  const updated = local.filter(p => p.id !== id);
  setLocal('projects', updated);
  return updated;
}

// 4. TEAMS / ASSIGNMENTS
export async function apiGetTeams(projectTitle = 'Smart irrigation monitoring') {
  const client = getSupabase();
  if (client) {
    try {
      const { data, error } = await client.from('teams').select('*').eq('project_title', projectTitle);
      if (!error && data) return [...new Set(data.map(d => d.member_name))];
    } catch (e) {
      console.warn('Supabase getTeams failed', e);
    }
  }
  return getLocal(`team_${projectTitle}`, []);
}

export async function apiSaveTeamMember(projectTitle, memberName, memberRole = 'Team member') {
  const client = getSupabase();
  if (client) {
    try {
      const { data: existing } = await client.from('teams').select('id')
        .eq('project_title', projectTitle).eq('member_name', memberName).limit(1);
      if (!existing || existing.length === 0) {
        await client.from('teams').insert([{
          project_title: projectTitle,
          member_name: memberName,
          member_role: memberRole
        }]);
      }
      const { data: members } = await client.from('teams').select('member_name').eq('project_title', projectTitle);
      if (members) {
        const names = [...new Set(members.map(m => m.member_name))];
        setLocal(`team_${projectTitle}`, names);
        return names;
      }
    } catch (e) {
      console.warn('Supabase saveTeamMember failed', e);
    }
  }
  const local = getLocal(`team_${projectTitle}`, []);
  if (!local.includes(memberName)) {
    const updated = [...local, memberName];
    setLocal(`team_${projectTitle}`, updated);
    return updated;
  }
  return local;
}


// ----------------- ACCOUNTS, ROLES, TALENT PROFILES & WORKS -----------------

// Returns { role: 'admin' | 'user' | 'talent', fullName }
// Role comes from the app_users table (set by the database, cannot be faked by the browser).
export async function apiGetAccount(user) {
  if (!user) return null;
  const fallbackRole = user.user_metadata?.role === 'talent' ? 'talent' : 'user';
  const fallback = { role: fallbackRole, fullName: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || '' };
  const client = getSupabase();
  if (!client || String(user.id).startsWith('local-')) return fallback;
  try {
    const { data, error } = await client.from('app_users').select('role, full_name').eq('id', user.id).maybeSingle();
    if (error) return fallback; // table not created yet -> safe default (never admin)
    if (!data) {
      // sign-up trigger didn't create the row: create it now (database only allows user/talent here)
      const row = { id: user.id, email: user.email, full_name: fallback.fullName, role: fallbackRole };
      const ins = await client.from('app_users').insert([row]).select('role, full_name').maybeSingle();
      if (ins.error || !ins.data) return fallback;
      return { role: ins.data.role, fullName: ins.data.full_name || fallback.fullName };
    }
    return { role: data.role, fullName: data.full_name || fallback.fullName };
  } catch {
    return fallback;
  }
}

// --- Admin: users & roles ---
export async function apiListUsers() {
  const client = getSupabase();
  if (!client) return [];
  const { data, error } = await client.from('app_users').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(error.message.includes('app_users') ? 'Run supabase_roles.sql in Supabase first.' : error.message);
  return data;
}

export async function apiSetUserRole(id, role) {
  const client = getSupabase();
  const { data, error } = await client.from('app_users').update({ role }).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return data;
}

// --- Talent: own profile ---
export async function apiGetMyProfile(userId) {
  const client = getSupabase();
  if (!client || !userId) return null;
  const { data, error } = await client.from('profiles').select('*').eq('user_id', userId).maybeSingle();
  if (error) {
    if (/user_id/.test(error.message)) throw new Error('Run supabase_roles.sql in Supabase first.');
    throw new Error(error.message);
  }
  return data;
}

export async function apiSaveMyProfile(userId, fields, existingId) {
  const client = getSupabase();
  if (!client) throw new Error('Connect Supabase first.');
  const skills = Array.isArray(fields.skills) ? fields.skills : String(fields.skills || '').split(',').map(x => x.trim()).filter(Boolean);
  const experience = Number(fields.experience) || 0;
  const row = {
    user_id: userId,
    name: fields.name.trim(),
    role: fields.role.trim(),
    skills,
    initials: fields.name.trim().split(/\s+/).map(x => x[0]).join('').slice(0, 2).toUpperCase(),
    city: fields.city || '',
    experience,
    availability: fields.availability || 'Available',
    portfolio_url: fields.portfolio_url || '',
    github_url: fields.github_url || '',
    linkedin_url: fields.linkedin_url || '',
    // profiles are publicly readable, so contact details are stored ONLY when the person chooses to show them
    ...(fields.withContact ? {
      contact_email: fields.show_contact ? (fields.contact_email || '') : '',
      contact_phone: fields.show_contact ? (fields.contact_phone || '') : '',
      show_contact: Boolean(fields.show_contact)
    } : {}),
    match: Math.min(95, 78 + experience * 2),
    // keep the bio in the same "City · X yrs · availability. About" format the site displays
    bio: `${fields.city || 'India'} · ${experience} yr${experience === 1 ? '' : 's'} experience · ${fields.availability || 'Available'}. ${fields.about || ''}`.trim()
  };
  const q = existingId
    ? client.from('profiles').update(row).eq('id', existingId).select().single()
    : client.from('profiles').insert([row]).select().single();
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data;
}

// "City · 3 yrs experience · Available. About text" -> About text
export function aboutFromBio(bio) {
  const s = String(bio || '');
  const i = s.indexOf('. ');
  return s.includes('·') && i > -1 ? s.slice(i + 2) : s;
}

// --- Works / portfolio ---
export async function apiGetWorks(profileId) {
  const client = getSupabase();
  if (!client) return [];
  let q = client.from('works').select('*').order('created_at', { ascending: false });
  if (profileId) q = q.eq('profile_id', profileId);
  const { data, error } = await q;
  if (error) return [];
  return data;
}

export async function apiAddWork(work) {
  const client = getSupabase();
  const row = {
    profile_id: work.profile_id,
    user_id: work.user_id,
    title: work.title.trim(),
    description: work.description || '',
    link: work.link || '',
    skills: Array.isArray(work.skills) ? work.skills : String(work.skills || '').split(',').map(x => x.trim()).filter(Boolean)
  };
  const { data, error } = await client.from('works').insert([row]).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function apiDeleteWork(id) {
  const client = getSupabase();
  const { error } = await client.from('works').delete().eq('id', id);
  if (error) throw new Error(error.message);
  return true;
}

// --- User: own problems ---
export async function apiGetMyProblems(userId) {
  const client = getSupabase();
  if (!client || !userId) return [];
  const { data, error } = await client.from('problems').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  if (error) return [];
  return data;
}

// ----------------- CONTACT / MESSAGES -----------------

export async function apiSendContact({ profile_id, sender_id, sender_name, sender_email, sender_phone, project_title, message }) {
  const client = getSupabase();
  if (!client) throw new Error('Connect Supabase first.');
  if (!/^[0-9a-f-]{36}$/i.test(String(profile_id))) throw new Error('This person is not saved in the database yet.');
  const row = {
    profile_id,
    sender_name: String(sender_name || '').trim().slice(0, 100),
    sender_email: String(sender_email || '').trim().slice(0, 200),
    sender_phone: String(sender_phone || '').trim().slice(0, 30),
    project_title: String(project_title || '').trim().slice(0, 200),
    message: String(message || '').trim().slice(0, 3000),
    ...(sender_id && !String(sender_id).startsWith('local-') ? { sender_id } : {})
  };
  // no .select(): senders who are not logged in are not allowed to read messages back
  const { error } = await client.from('contact_requests').insert([row]);
  if (error) {
    if (/contact_requests/.test(error.message)) throw new Error('Messaging is not set up yet: run supabase_contact.sql in Supabase.');
    throw new Error(error.message);
  }
  return true;
}

// Messages for one person (talent inbox) or all messages (admin) when profileId is omitted
export async function apiGetContacts(profileId) {
  const client = getSupabase();
  if (!client) return [];
  let q = client.from('contact_requests').select('*, profiles(name, role, user_id)').order('created_at', { ascending: false });
  if (profileId) q = q.eq('profile_id', profileId);
  const { data, error } = await q;
  if (error) throw new Error(/contact_requests/.test(error.message) ? 'Run supabase_contact.sql in Supabase to enable messages.' : error.message);
  return data;
}

export async function apiGetSentContacts(userId) {
  const client = getSupabase();
  if (!client || !userId) return [];
  const { data, error } = await client.from('contact_requests').select('*, profiles(name, role)').eq('sender_id', userId).order('created_at', { ascending: false });
  if (error) return [];
  return data;
}

export async function apiSetContactStatus(id, status) {
  const client = getSupabase();
  const { error } = await client.from('contact_requests').update({ status }).eq('id', id);
  if (error) throw new Error(error.message);
  return true;
}

export async function apiDeleteContact(id) {
  const client = getSupabase();
  const { error } = await client.from('contact_requests').delete().eq('id', id);
  if (error) throw new Error(error.message);
  return true;
}

export async function apiHasContactColumns() {
  const client = getSupabase();
  if (!client) return false;
  const { error } = await client.from('profiles').select('show_contact').limit(1);
  return !error;
}
