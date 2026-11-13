// LOGIN PAGE: choose Admin / Talent / User, then sign in or sign up (Supabase Auth).
import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, AlertCircle, Lock, Briefcase, Store, ShieldCheck, ArrowLeft } from 'lucide-react';
import { apiSignIn, apiSignUp, apiSignOut, apiGetAccount } from '../database.js';

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

export function AuthForm({ portal, onBack, onLoggedIn }) {
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

