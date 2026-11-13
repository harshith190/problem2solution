// TALENT PAGE (talent only): edit my profile, skills and works, and read messages sent to me.
import React, { useState, useEffect } from 'react';
import { Target, Clock, Plus, Trash2, CheckCircle2, AlertCircle, ExternalLink, Briefcase, MapPin, Save, Eye } from 'lucide-react';
import { apiGetMyProfile, apiSaveMyProfile, aboutFromBio, apiGetWorks, apiAddWork, apiDeleteWork, apiHasContactColumns } from '../database.js';
import { MessagesCard, DashHeader } from '../components.jsx';

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

