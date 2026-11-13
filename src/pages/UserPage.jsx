// USER PAGE (normal user / business): my submitted problems and messages I sent.
import React, { useState, useEffect } from 'react';
import { ArrowRight, Target, Plus, MessageCircle, Trash2, RefreshCw, AlertCircle } from 'lucide-react';
import { apiDeleteProblem, apiGetMyProblems, apiGetSentContacts } from '../database.js';
import { DashHeader } from '../components.jsx';

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

