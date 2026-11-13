import React, { useEffect, useState } from 'react';
import {
  Sparkles, Lock, AlertCircle, CheckCircle2, Briefcase, Store, ShieldCheck, ArrowRight, ArrowLeft,
  Plus, Trash2, ExternalLink, Users, Target, RefreshCw, LogOut, X, MapPin, Clock, Save, Eye,
  MessageCircle, Mail, Phone, Send, Inbox
} from 'lucide-react';
import {
  apiSignIn, apiSignUp, apiSignOut, apiGetAccount,
  apiListUsers, apiSetUserRole,
  apiGetMyProfile, apiSaveMyProfile, aboutFromBio,
  apiGetWorks, apiAddWork, apiDeleteWork,
  apiGetMyProblems, apiDeleteProblem,
  apiSendContact, apiGetContacts, apiGetSentContacts, apiSetContactStatus, apiDeleteContact, apiHasContactColumns
} from './supabaseClient';

export const HOME_FOR_ROLE = { admin: 'admin', talent: 'talent', user: 'account' };

const PORTALS = {
  user: {
    icon: <Store size={22} />,
    title: 'Business / User',
    blurb: 'Post a problem, get an AI plan and find people to build it.',
    canSignUp: true
  },
  talent: {
    icon: <Briefcase size={22} />,
    title: 'Talent',
    blurb: 'Show your skills and work so businesses can find and hire you.',
    canSignUp: true
  },
  admin: {
    icon: <ShieldCheck size={22} />,
    title: 'Admin',
    blurb: 'Manage people, problems, projects and user roles.',
    canSignUp: false
  }
};

// =========================================================
// LOGIN PORTAL: pick who you are, then sign in / sign up
// =========================================================
export function LoginPortal({ onLoggedIn, initialPortal }) {
  const [portal, setPortal] = useState(initialPortal || null);

  if (!portal) {
    return (
      <main className="page">
        <div className="pageHead" style={{ textAlign: 'center' }}>
          <span className="eyebrow"><Lock size={15} /> Sign in</span>
          <h1>How do you want to use Problem2Solution?</h1>
          <p>Choose your portal. Each one has its own dashboard.</p>
        </div>
        <div className="portalGrid">
          {Object.entries(PORTALS).map(([key, p]) => (
            <button key={key} className={`card portalCard ${key}`} onClick={() => setPortal(key)}>
              <span className="portalIcon">{p.icon}</span>
              <h3>{p.title}</h3>
              <p>{p.blurb}</p>
              <span className="textbtn">{p.canSignUp ? 'Sign in or create account' : 'Admin sign in'} <ArrowRight size={15} /></span>
            </button>
          ))}
        </div>
      </main>
    );
  }

  return <AuthForm portal={portal} onBack={() => setPortal(null)} onLoggedIn={onLoggedIn} />;
}

function AuthForm({ portal, onBack, onLoggedIn }) {
  const info = PORTALS[portal];
  const [isSignUp, setIsSignUp] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (isSignUp && password.length < 6) return setError('Password must be at least 6 characters.');
    setLoading(true);

    if (isSignUp) {
      const res = await apiSignUp(email, password, { role: portal, fullName });
      setLoading(false);
      if (!res.success) return setError(res.error || 'Could not create account.');
      if (!res.session && !String(res.user?.id).startsWith('local-')) {
        // Supabase "Confirm email" is ON: user must click the link first
        setSuccess('Account created! Check your email and click the confirmation link, then sign in here.');
        setIsSignUp(false);
        return;
      }
      const account = await apiGetAccount(res.user);
      onLoggedIn(res.user, account);
      return;
    }

    const res = await apiSignIn(email, password);
    if (!res.success) {
      setLoading(false);
      const msg = res.error || 'Invalid email or password.';
      return setError(/confirm/i.test(msg) ? 'Please confirm your email first (check your inbox), then sign in.' : msg);
    }
    const account = await apiGetAccount(res.user);
    setLoading(false);

    // Make sure people use the right portal
    if (portal === 'admin' && account.role !== 'admin') {
      await apiSignOut();
      return setError('This account is not an admin. Use the Business / User or Talent portal.');
    }
    if (portal !== 'admin' && account.role !== portal && account.role !== 'admin') {
      setSuccess(`Signed in. Your account is a ${account.role === 'talent' ? 'Talent' : 'Business / User'} account, so we opened that dashboard.`);
    }
    onLoggedIn(res.user, account);
  };

  return (
    <main className="page">
      <div className="authWrapper">
        <div className="authCard">
          <button className="back" onClick={onBack}><ArrowLeft size={13} /> All portals</button>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <span className={`portalIcon ${portal}`} style={{ margin: '0 auto 12px' }}>{info.icon}</span>
            <h2 style={{ margin: '0 0 6px', fontSize: 22 }}>{info.title} {isSignUp ? 'sign up' : 'sign in'}</h2>
            <p className="muted" style={{ fontSize: 13, margin: 0 }}>{info.blurb}</p>
          </div>

          {info.canSignUp && (
            <div className="authTabs">
              <button className={`authTab ${!isSignUp ? 'active' : ''}`} type="button" onClick={() => { setIsSignUp(false); setError(''); setSuccess(''); }}>Sign in</button>
              <button className={`authTab ${isSignUp ? 'active' : ''}`} type="button" onClick={() => { setIsSignUp(true); setError(''); setSuccess(''); }}>Create account</button>
            </div>
          )}

          {error && <div className="authAlert error"><AlertCircle size={15} /> {error}</div>}
          {success && <div className="authAlert success"><CheckCircle2 size={15} /> {success}</div>}

          <form onSubmit={submit} className="adminForm">
            {isSignUp && (
              <label>
                Full name
                <input required placeholder="e.g. Priya Sharma" value={fullName} onChange={e => setFullName(e.target.value)} />
              </label>
            )}
            <label>
              Email
              <input type="email" required autoComplete="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
            </label>
            <label>
              Password
              <input type="password" required autoComplete={isSignUp ? 'new-password' : 'current-password'} placeholder={isSignUp ? 'At least 6 characters' : '••••••••'} value={password} onChange={e => setPassword(e.target.value)} />
            </label>
            <button className="primary wide" type="submit" disabled={loading} style={{ marginTop: 10 }}>
              <Lock size={15} /> {loading ? 'Please wait…' : isSignUp ? 'Create account' : 'Sign in'}
            </button>
          </form>

          {portal === 'admin' && (
            <p className="muted" style={{ fontSize: 12, marginTop: 14 }}>
              Admin accounts can't be created here. Create a normal account, then make it admin in Supabase (see README).
            </p>
          )}
          {portal === 'talent' && isSignUp && (
            <p className="muted" style={{ fontSize: 12, marginTop: 14 }}>
              After signing up you'll fill in your skills and work. Your profile then appears in the People directory.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}

// =========================================================
// TALENT DASHBOARD: my profile + my works
// =========================================================
const emptyProfile = { name: '', role: '', skills: '', city: '', experience: 1, availability: 'Available', about: '', portfolio_url: '', github_url: '', linkedin_url: '', contact_email: '', contact_phone: '', show_contact: false };

export function TalentDashboard({ user, account, onLogout, onProfilesChanged }) {
  const [profileId, setProfileId] = useState(null);
  const [form, setForm] = useState({ ...emptyProfile, name: account?.fullName || '' });
  const [works, setWorks] = useState([]);
  const [newWork, setNewWork] = useState({ title: '', description: '', link: '', skills: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [contactReady, setContactReady] = useState(false);

  const flash = (text, ok = true) => { setMsg({ text, ok }); setTimeout(() => setMsg(null), 5000); };

  useEffect(() => {
    (async () => {
      try {
        setContactReady(await apiHasContactColumns());
        const p = await apiGetMyProfile(user.id);
        if (p) {
          setProfileId(p.id);
          setForm({
            name: p.name || '', role: p.role || '', skills: (p.skills || []).join(', '),
            city: p.city || '', experience: p.experience ?? 1, availability: p.availability || 'Available',
            about: aboutFromBio(p.bio), portfolio_url: p.portfolio_url || '', github_url: p.github_url || '', linkedin_url: p.linkedin_url || '',
            contact_email: p.contact_email || user.email || '', contact_phone: p.contact_phone || '', show_contact: Boolean(p.show_contact)
          });
          setWorks(await apiGetWorks(p.id));
        }
      } catch (err) {
        flash(err.message, false);
      } finally {
        setLoading(false);
      }
    })();
  }, [user.id]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const saved = await apiSaveMyProfile(user.id, { ...form, withContact: contactReady }, profileId);
      setProfileId(saved.id);
      onProfilesChanged?.();
      flash(profileId ? 'Profile updated. Changes are live on the site.' : 'Profile published! You now appear in the People directory.');
    } catch (err) {
      flash(err.message, false);
    } finally {
      setSaving(false);
    }
  };

  const addWork = async (e) => {
    e.preventDefault();
    if (!profileId) return flash('Save your profile first, then add your work.', false);
    try {
      const w = await apiAddWork({ ...newWork, profile_id: profileId, user_id: user.id });
      setWorks([w, ...works]);
      setNewWork({ title: '', description: '', link: '', skills: '' });
      flash('Work added to your profile.');
    } catch (err) {
      flash(err.message, false);
    }
  };

  const removeWork = async (id) => {
    if (!confirm('Delete this work from your profile?')) return;
    try {
      await apiDeleteWork(id);
      setWorks(works.filter(w => w.id !== id));
    } catch (err) {
      flash(err.message, false);
    }
  };

  const skillsArr = form.skills.split(',').map(x => x.trim()).filter(Boolean);

  return (
    <main className="page">
      <DashHeader
        tag="Talent dashboard"
        title={profileId ? 'Your public profile' : 'Create your talent profile'}
        subtitle={`Signed in as ${user.email}. Businesses find you by the skills you list here.`}
        onLogout={onLogout}
      />
      {msg && <div className={`authAlert ${msg.ok ? 'success' : 'error'}`}>{msg.ok ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />} {msg.text}</div>}
      {loading ? <p className="muted">Loading your profile…</p> : (
        <div className="adminGrid">
          <section className="card">
            <div className="cardTitle"><span className="cardIcon"><Briefcase size={17} /></span><h3>About you</h3></div>
            <form className="adminForm" onSubmit={save}>
              <div className="formRow">
                <label>Full name<input required value={form.name} onChange={set('name')} placeholder="Priya Sharma" /></label>
                <label>Title / role<input required value={form.role} onChange={set('role')} placeholder="e.g. Flutter Developer, Graphic Designer" /></label>
              </div>
              <label>Skills (comma-separated)<input required value={form.skills} onChange={set('skills')} placeholder="e.g. React, Node.js, Figma, SEO" /></label>
              <div className="formRow">
                <label>City<input value={form.city} onChange={set('city')} placeholder="Hyderabad" /></label>
                <label>Years of experience<input type="number" min="0" max="40" value={form.experience} onChange={set('experience')} /></label>
              </div>
              <label>Availability
                <select value={form.availability} onChange={set('availability')}>
                  {['Available', 'Available part-time', 'Available for freelance', 'Available weekends', 'Not available'].map(a => <option key={a}>{a}</option>)}
                </select>
              </label>
              <label>About you<textarea rows={3} maxLength={400} value={form.about} onChange={set('about')} placeholder="One or two lines about what you build and for whom." /></label>
              <div className="formRow">
                <label>Portfolio / website<input type="url" value={form.portfolio_url} onChange={set('portfolio_url')} placeholder="https://" /></label>
                <label>GitHub<input type="url" value={form.github_url} onChange={set('github_url')} placeholder="https://github.com/…" /></label>
              </div>
              <label>LinkedIn<input type="url" value={form.linkedin_url} onChange={set('linkedin_url')} placeholder="https://linkedin.com/in/…" /></label>
              {contactReady && (
                <fieldset className="contactSettings">
                  <legend>How businesses can reach you</legend>
                  <p className="muted" style={{ margin: 0, fontSize: 12 }}>Everyone can always send you a message through the site; it arrives in your inbox below.</p>
                  <div className="formRow">
                    <label>Contact email<input type="email" value={form.contact_email} onChange={set('contact_email')} placeholder={user.email} /></label>
                    <label>WhatsApp / phone<input type="tel" value={form.contact_phone} onChange={set('contact_phone')} placeholder="+91 98xxxxxxx" /></label>
                  </div>
                  <label className="checkRow">
                    <input type="checkbox" checked={form.show_contact} onChange={e => setForm({ ...form, show_contact: e.target.checked })} />
                    Show my email and WhatsApp publicly on my profile
                  </label>
                  {!form.show_contact && <small className="muted">While unticked, these details are not saved anywhere public.</small>}
                </fieldset>
              )}
              <button className="primary" type="submit" disabled={saving}><Save size={15} /> {saving ? 'Saving…' : profileId ? 'Save changes' : 'Publish profile'}</button>
            </form>
          </section>

          <section className="card">
            <div className="cardTitle"><span className="cardIcon"><Eye size={17} /></span><h3>How businesses see you</h3></div>
            <div className="profilePreview">
              <div className="personAvatar large">{(form.name || '?').split(/\s+/).map(x => x[0]).join('').slice(0, 2).toUpperCase()}</div>
              <h3>{form.name || 'Your name'}</h3>
              <span>{form.role || 'Your role'}</span>
              <p className="muted" style={{ fontSize: 12 }}>
                <MapPin size={12} /> {form.city || 'City'} · <Clock size={12} /> {form.experience || 0} yrs · {form.availability}
              </p>
              <div className="chips">{skillsArr.map(s => <span className="smallChip" key={s}>{s}</span>)}</div>
            </div>

            <div className="cardTitle" style={{ marginTop: 24 }}><span className="cardIcon"><Target size={17} /></span><h3>Your projects & work ({works.length})</h3></div>
            <form className="adminForm" onSubmit={addWork}>
              <label>Title<input required maxLength={150} value={newWork.title} onChange={e => setNewWork({ ...newWork, title: e.target.value })} placeholder="e.g. Online store for a bakery" /></label>
              <label>What you did<textarea rows={2} maxLength={2000} value={newWork.description} onChange={e => setNewWork({ ...newWork, description: e.target.value })} placeholder="What it does and your part in it" /></label>
              <div className="formRow">
                <label>Link (optional)<input type="url" value={newWork.link} onChange={e => setNewWork({ ...newWork, link: e.target.value })} placeholder="https://" /></label>
                <label>Skills used<input value={newWork.skills} onChange={e => setNewWork({ ...newWork, skills: e.target.value })} placeholder="React, Razorpay" /></label>
              </div>
              <button className="secondary" type="submit" disabled={!profileId}><Plus size={15} /> Add work</button>
              {!profileId && <small className="muted">Publish your profile first.</small>}
            </form>
            <div className="itemList" style={{ marginTop: 12 }}>
              {works.map(w => (
                <div className="itemCard" key={w.id}>
                  <div>
                    <h4>{w.title}</h4>
                    {w.description && <p>{w.description}</p>}
                    <div className="chips">{(w.skills || []).map(s => <span className="smallChip" key={s}>{s}</span>)}</div>
                    {w.link && <a href={w.link} target="_blank" rel="noreferrer" className="textbtn">Open <ExternalLink size={13} /></a>}
                  </div>
                  <button className="dangerBtn" onClick={() => removeWork(w.id)}><Trash2 size={13} /></button>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
      {profileId && <MessagesCard profileId={profileId} title="Messages from businesses" />}
    </main>
  );
}

// =========================================================
// MESSAGES: inbox for talent (one profile) or admin (all)
// =========================================================
export function MessagesCard({ profileId, title }) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');

  const load = async () => {
    setError('');
    try { setItems(await apiGetContacts(profileId)); } catch (err) { setError(err.message); setItems([]); }
  };
  useEffect(() => { load(); }, [profileId]);

  const mark = async (m, status) => {
    try {
      await apiSetContactStatus(m.id, status);
      setItems(items.map(x => (x.id === m.id ? { ...x, status } : x)));
    } catch (err) { setError(err.message); }
  };
  const remove = async (m) => {
    if (!confirm('Delete this message?')) return;
    try {
      await apiDeleteContact(m.id);
      setItems(items.filter(x => x.id !== m.id));
    } catch (err) { setError(err.message); }
  };

  const unread = (items || []).filter(m => m.status === 'new').length;

  return (
    <section className="card" style={{ marginTop: 18 }}>
      <div className="cardTitle">
        <span className="cardIcon"><Inbox size={17} /></span>
        <h3>{title} ({items ? items.length : '…'}){unread ? <span className="badge newBadge">{unread} new</span> : null}</h3>
        <button className="iconbtn" style={{ marginLeft: 'auto' }} onClick={load} title="Refresh"><RefreshCw size={15} /></button>
      </div>
      {error && <div className="authAlert error"><AlertCircle size={15} /> {error}</div>}
      {items && items.length === 0 && !error && <p className="muted">No messages yet.</p>}
      <div className="itemList">
        {(items || []).map(m => (
          <div className={`itemCard message ${m.status}`} key={m.id}>
            <div style={{ flex: 1 }}>
              {!profileId && m.profiles && <span className="tag">To: {m.profiles.name}{!m.profiles.user_id ? ' (no account — handle as admin)' : ''}</span>}
              <h4>{m.sender_name} {m.status === 'new' && <span className="badge newBadge">new</span>}</h4>
              {m.project_title && <p style={{ margin: '2px 0', fontWeight: 600 }}>Re: {m.project_title}</p>}
              <p style={{ whiteSpace: 'pre-wrap' }}>{m.message}</p>
              <div className="problemMeta">
                <a href={`mailto:${m.sender_email}?subject=${encodeURIComponent('Re: ' + (m.project_title || 'Your message on Problem2Solution'))}`} onClick={() => m.status === 'new' && mark(m, 'replied')}><Mail size={13} /> {m.sender_email}</a>
                {m.sender_phone && <a href={`https://wa.me/${m.sender_phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer"><Phone size={13} /> {m.sender_phone}</a>}
                <span>{new Date(m.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <select className="roleSelect" value={m.status} onChange={e => mark(m, e.target.value)}>
                <option value="new">New</option>
                <option value="read">Read</option>
                <option value="replied">Replied</option>
                <option value="closed">Closed</option>
              </select>
              <button className="dangerBtn" onClick={() => remove(m)}><Trash2 size={13} /></button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// =========================================================
// CONTACT FORM (opens from any person card)
// =========================================================
export function ContactModal({ person, user, account, projectTitle, onClose }) {
  const [form, setForm] = useState({
    sender_name: account?.fullName || '',
    sender_email: user?.email || '',
    sender_phone: '',
    project_title: projectTitle || '',
    message: projectTitle
      ? `Hi ${person.name.split(' ')[0]}, I'm looking for help with "${projectTitle}". Your skills look like a great fit. Are you available to discuss it?`
      : `Hi ${person.name.split(' ')[0]}, I found your profile on Problem2Solution and would like to talk about a project.`
  });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const send = async (e) => {
    e.preventDefault();
    setError('');
    setSending(true);
    try {
      await apiSendContact({ ...form, profile_id: person.id, sender_id: user?.id });
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  const showDirect = person.show_contact && (person.contact_email || person.contact_phone);

  return (
    <div className="modalBack" onClick={onClose}>
      <div className="modalCard" onClick={e => e.stopPropagation()}>
        <button className="iconbtn modalClose" onClick={onClose} title="Close"><X size={18} /></button>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 14 }}>
          <div className="personAvatar large" style={{ margin: 0 }}>{person.initials || person.name.slice(0, 2).toUpperCase()}</div>
          <div>
            <h2 style={{ margin: 0, fontSize: 19 }}>Contact {person.name}</h2>
            <span className="muted">{person.role}</span>
          </div>
        </div>

        {showDirect && (
          <div className="directContact">
            {person.contact_email && <a className="secondary" href={`mailto:${person.contact_email}`}><Mail size={15} /> {person.contact_email}</a>}
            {person.contact_phone && <a className="secondary" href={`https://wa.me/${person.contact_phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer"><Phone size={15} /> WhatsApp</a>}
          </div>
        )}

        {sent ? (
          <div className="empty">
            <CheckCircle2 size={32} color="#16834b" />
            <b>Message sent to {person.name.split(' ')[0]}</b>
            <span>They'll reply to {form.sender_email}{form.sender_phone ? ` or ${form.sender_phone}` : ''}.</span>
            <button className="primary" onClick={onClose} style={{ marginTop: 10 }}>Done</button>
          </div>
        ) : (
          <form className="adminForm" onSubmit={send}>
            {error && <div className="authAlert error"><AlertCircle size={15} /> {error}</div>}
            <div className="formRow">
              <label>Your name<input required maxLength={100} value={form.sender_name} onChange={set('sender_name')} /></label>
              <label>Your email<input required type="email" maxLength={200} value={form.sender_email} onChange={set('sender_email')} /></label>
            </div>
            <div className="formRow">
              <label>WhatsApp / phone (optional)<input type="tel" maxLength={30} value={form.sender_phone} onChange={set('sender_phone')} placeholder="+91 …" /></label>
              <label>Project<input maxLength={200} value={form.project_title} onChange={set('project_title')} placeholder="e.g. Online store for my shop" /></label>
            </div>
            <label>Message<textarea required rows={5} maxLength={3000} value={form.message} onChange={set('message')} /></label>
            <button className="primary" type="submit" disabled={sending}><Send size={15} /> {sending ? 'Sending…' : 'Send message'}</button>
            <small className="muted">Your email is shared only with {person.name.split(' ')[0]} (and site admins) so they can reply.</small>
          </form>
        )}
      </div>
    </div>
  );
}

// =========================================================
// USER (BUSINESS) DASHBOARD: my problems
// =========================================================
export function UserDashboard({ user, account, onLogout, onAnalyze, onNewProblem }) {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [sent, setSent] = useState([]);
  const load = async () => {
    setLoading(true);
    const [mine, msgs] = await Promise.all([apiGetMyProblems(user.id), apiGetSentContacts(user.id)]);
    setProblems(mine);
    setSent(msgs);
    setLoading(false);
  };
  useEffect(() => { load(); }, [user.id]);

  const remove = async (id) => {
    if (!confirm('Delete this problem?')) return;
    try {
      await apiDeleteProblem(id);
      setProblems(problems.filter(p => p.id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <main className="page">
      <DashHeader
        tag="My account"
        title={`Welcome${account?.fullName ? ', ' + account.fullName : ''}`}
        subtitle={`Signed in as ${user.email}. Describe a problem and we'll find people who can solve it.`}
        onLogout={onLogout}
        extra={<button className="primary" onClick={onNewProblem}><Plus size={15} /> New problem</button>}
      />
      {error && <div className="authAlert error"><AlertCircle size={15} /> {error}</div>}
      <section className="card">
        <div className="cardTitle">
          <span className="cardIcon"><Target size={17} /></span><h3>My problems ({problems.length})</h3>
          <button className="iconbtn" style={{ marginLeft: 'auto' }} onClick={load} title="Refresh"><RefreshCw size={15} /></button>
        </div>
        {loading && <p className="muted">Loading…</p>}
        {!loading && problems.length === 0 && (
          <div className="empty">
            <Target size={28} />
            <b>No problems yet</b>
            <span>Click "New problem" to describe what you need built.</span>
          </div>
        )}
        <div className="itemList">
          {problems.map(p => (
            <div className="itemCard" key={p.id}>
              <div>
                <span className="tag">{p.domain}</span>
                <h4>{p.title}</h4>
                <p>{p.description}</p>
                <div className="problemMeta">
                  <span>{p.budget}</span><span>{p.timeline}</span>
                  <span>{new Date(p.created_at).toLocaleDateString('en-IN')}</span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <button className="secondary" onClick={() => onAnalyze(p)}>Find people <ArrowRight size={14} /></button>
                <button className="dangerBtn" onClick={() => remove(p.id)}><Trash2 size={13} /> Delete</button>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="card" style={{ marginTop: 18 }}>
        <div className="cardTitle"><span className="cardIcon"><MessageCircle size={17} /></span><h3>People I contacted ({sent.length})</h3></div>
        {sent.length === 0 && <p className="muted">Use the Contact button on anyone in People or in your analysis results.</p>}
        <div className="itemList">
          {sent.map(m => (
            <div className="itemCard" key={m.id}>
              <div>
                <h4>{m.profiles?.name || 'Someone'} <small className="muted">· {m.profiles?.role}</small></h4>
                {m.project_title && <p style={{ margin: '2px 0', fontWeight: 600 }}>Re: {m.project_title}</p>}
                <p>{m.message}</p>
                <small className="muted">{new Date(m.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</small>
              </div>
              <span className={`statusPill ${m.status}`}>{m.status === 'new' ? 'Sent' : m.status === 'read' ? 'Seen' : m.status === 'replied' ? 'Replied' : 'Closed'}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

// =========================================================
// ADMIN: users & roles tab
// =========================================================
export function AdminUsersTab({ currentUserId }) {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(null);

  const load = async () => {
    setError('');
    try { setUsers(await apiListUsers()); } catch (err) { setError(err.message); }
  };
  useEffect(() => { load(); }, []);

  const change = async (u, role) => {
    if (u.id === currentUserId && role !== 'admin' && !confirm('Remove your own admin access?')) return;
    setBusy(u.id);
    try {
      const saved = await apiSetUserRole(u.id, role);
      setUsers(users.map(x => (x.id === u.id ? saved : x)));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  };

  const counts = users.reduce((c, u) => ({ ...c, [u.role]: (c[u.role] || 0) + 1 }), {});

  return (
    <section className="card">
      <div className="cardTitle">
        <span className="cardIcon"><Users size={17} /></span>
        <h3>Accounts ({users.length}) · {counts.admin || 0} admin · {counts.user || 0} users · {counts.talent || 0} talent</h3>
        <button className="iconbtn" style={{ marginLeft: 'auto' }} onClick={load} title="Refresh"><RefreshCw size={15} /></button>
      </div>
      {error && <div className="authAlert error"><AlertCircle size={15} /> {error}</div>}
      <div className="itemList">
        {users.map(u => (
          <div className="itemCard" key={u.id}>
            <div>
              <h4>{u.full_name || u.email}</h4>
              <p style={{ margin: '2px 0' }}>{u.email}</p>
              <small className="muted">Joined {new Date(u.created_at).toLocaleDateString('en-IN')}</small>
            </div>
            <select value={u.role} disabled={busy === u.id} onChange={e => change(u, e.target.value)} className={`roleSelect ${u.role}`}>
              <option value="user">Business / User</option>
              <option value="talent">Talent</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        ))}
        {!error && users.length === 0 && <p className="muted">No accounts yet.</p>}
      </div>
    </section>
  );
}

// =========================================================
// PUBLIC PROFILE MODAL (People directory)
// =========================================================
export function ProfileModal({ person, onClose, onContact }) {
  const [works, setWorks] = useState(null);
  useEffect(() => {
    if (person?.id && /^[0-9a-f-]{36}$/i.test(String(person.id))) apiGetWorks(person.id).then(setWorks);
    else setWorks([]);
  }, [person?.id]);
  if (!person) return null;
  const links = [['Portfolio', person.portfolio_url], ['GitHub', person.github_url], ['LinkedIn', person.linkedin_url]].filter(([, url]) => url);

  return (
    <div className="modalBack" onClick={onClose}>
      <div className="modalCard" onClick={e => e.stopPropagation()}>
        <button className="iconbtn modalClose" onClick={onClose} title="Close"><X size={18} /></button>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <div className="personAvatar large" style={{ margin: 0 }}>{person.initials || person.name.slice(0, 2).toUpperCase()}</div>
          <div>
            <h2 style={{ margin: 0 }}>{person.name}</h2>
            <span className="muted">{person.role}</span>
          </div>
        </div>
        {person.bio && <p className="muted" style={{ marginTop: 14 }}>{person.bio}</p>}
        <div className="chips">{(person.skills || []).map(s => <span className="smallChip" key={s}>{s}</span>)}</div>
        {links.length > 0 && (
          <div style={{ display: 'flex', gap: 14, marginTop: 12 }}>
            {links.map(([label, url]) => <a key={label} className="textbtn" href={url} target="_blank" rel="noreferrer">{label} <ExternalLink size={13} /></a>)}
          </div>
        )}
        <div className="directContact" style={{ marginTop: 14 }}>
          {onContact && <button className="primary" onClick={() => onContact(person)}><MessageCircle size={15} /> Contact {person.name.split(' ')[0]}</button>}
          {person.show_contact && person.contact_email && <a className="secondary" href={`mailto:${person.contact_email}`}><Mail size={15} /> Email</a>}
          {person.show_contact && person.contact_phone && <a className="secondary" href={`https://wa.me/${person.contact_phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer"><Phone size={15} /> WhatsApp</a>}
        </div>
        <h3 style={{ marginTop: 20, fontSize: 15 }}>Projects & work</h3>
        {works === null && <p className="muted">Loading…</p>}
        {works && works.length === 0 && <p className="muted">No work added yet.</p>}
        {works && works.map(w => (
          <div className="similar" key={w.id}>
            <div>
              <b>{w.title}</b>
              {w.description && <span>{w.description}</span>}
            </div>
            {w.link && <a className="textbtn" href={w.link} target="_blank" rel="noreferrer"><ExternalLink size={14} /></a>}
          </div>
        ))}
      </div>
    </div>
  );
}

function DashHeader({ tag, title, subtitle, onLogout, extra }) {
  return (
    <div className="adminHeader">
      <div>
        <span className="eyebrow"><Sparkles size={15} /> {tag}</span>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        {extra}
        <button className="dangerBtn" onClick={onLogout}><LogOut size={15} /> Sign out</button>
      </div>
    </div>
  );
}
