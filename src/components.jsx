// SHARED COMPONENTS: small cards and popups used on many pages.
import React, { useState, useEffect } from 'react';
import { Sparkles, Check, Plus, X, MessageCircle, Trash2, RefreshCw, CheckCircle2, AlertCircle, ExternalLink, LogOut, Lock, Send, Mail, Phone, Inbox } from 'lucide-react';
import { apiGetWorks, apiSendContact, apiGetContacts, apiSetContactStatus, apiDeleteContact } from './database.js';
import { normSkill } from './ai.js';

export function NoAccess({ role, onGo }) {
  return (
    <main className="page">
      <div className="empty card" style={{ maxWidth: 520, margin: '40px auto' }}>
        <Lock size={28} />
        <b>This page isn't for your account</b>
        <span>You're signed in as {role === 'talent' ? 'Talent' : role === 'admin' ? 'Admin' : 'a Business / User'}.</span>
        <button className="primary" onClick={onGo} style={{ marginTop: 10 }}>Go to my dashboard</button>
      </div>
    </main>
  );
}

export function Metric({ label, value }) {
  return <div><small>{label}</small><strong>{value}</strong></div>;
}


export function Card({ title, icon, children }) {
  return (
    <section className="card">
      <div className="cardTitle"><span className="cardIcon">{icon}</span><h3>{title}</h3></div>
      {children}
    </section>
  );
}


export function Person({ p, add, inTeam, onContact }) {
  const skills = Array.isArray(p.skills) ? p.skills : String(p.skills || '').split(',').map(x => x.trim());
  const hit = new Set((p.matchedSkills || []).map(normSkill));
  const place = (p.bio || '').split('·').slice(0, 2).join('·').trim();
  return (
    <div className="person">
      <div className="personAvatar">{p.initials || p.name?.slice(0, 2).toUpperCase()}</div>
      <div className="personInfo">
        <b>{p.name}</b>
        <span>{p.role}{place ? ` · ${place}` : ''}</span>
        <small>
          {skills.map((s, i) => (
            <React.Fragment key={s}>
              {i > 0 && ' · '}
              <em className={hit.has(normSkill(s)) ? 'skillHit' : 'skill'}>{s}</em>
            </React.Fragment>
          ))}
        </small>
      </div>
      {p.match > 0 && <div className="match">{p.match}%</div>}
      {onContact && (
        <button className="plus contactBtn" onClick={() => onContact(p)} title={`Contact ${p.name}`}><MessageCircle size={15} /></button>
      )}
      <button className="plus" onClick={() => add(p)} title={inTeam ? 'In your team' : 'Add to team'} disabled={inTeam}>
        {inTeam ? <Check size={16} /> : <Plus size={16} />}
      </button>
    </div>
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

export function DashHeader({ tag, title, subtitle, onLogout, extra }) {
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
