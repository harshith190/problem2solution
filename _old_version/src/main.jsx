import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Search, Bell, Sparkles, ArrowRight, Check, AlertTriangle, Users, Brain, Layers,
  Target, Clock, IndianRupee, Plus, ChevronRight, X, Menu, Zap, CircleCheck,
  MessageCircle, Shield, Trash2, Database, Upload, RefreshCw, CheckCircle2, AlertCircle,
  ExternalLink, LogIn, LogOut, Lock, Bot, Send
} from 'lucide-react';
import './styles.css';
import {
  apiGetProblems, apiAddProblem, apiDeleteProblem,
  apiGetProfiles, apiAddProfile, apiDeleteProfile,
  apiGetProjects, apiAddProject, apiDeleteProject,
  apiGetTeams, apiSaveTeamMember,
  apiSignIn, apiSignUp, apiSignOut, apiGetCurrentUser,
  getCredentials, saveCredentials, testConnection, apiGetAccount
} from './supabaseClient';
import { LoginPortal, TalentDashboard, UserDashboard, AdminUsersTab, ProfileModal, ContactModal, MessagesCard, HOME_FOR_ROLE } from './accounts';
import {
  analyzeProblemWithAI, askProjectAssistant, getQuickAnalysis,
  getGeminiKey, saveGeminiKey, testGeminiApiKey
} from './geminiService';
import { searchPeople, scorePeople, normSkill } from './matching';

const demoProblem = 'Farmers in rural areas waste water because they do not know when their crops actually need irrigation.';

function App() {
  const [page, setPage] = useState('home');
  const [problem, setProblem] = useState('');
  const [analyzed, setAnalyzed] = useState(false);
  const [team, setTeam] = useState([]);
  const [menu, setMenu] = useState(false);

  // Authentication state
  const [user, setUser] = useState(null);
  const [account, setAccount] = useState(null); // { role: 'admin' | 'user' | 'talent', fullName }
  const [contactPerson, setContactPerson] = useState(null); // person being contacted (opens the contact form)

  // Supabase-backed live states
  const [problems, setProblems] = useState([]);
  const [people, setPeople] = useState([]);
  const [projects, setProjects] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [dbStatus, setDbStatus] = useState({ isConfigured: false, connected: false, message: '' });

  // Gemini AI state
  const [aiResult, setAiResult] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  // Initial load from Supabase backend & Auth
  const loadData = async () => {
    const creds = getCredentials();
    const [fetchedProblems, fetchedProfiles, fetchedProjects, fetchedTeam, currentUser] = await Promise.all([
      apiGetProblems(),
      apiGetProfiles(),
      apiGetProjects(),
      apiGetTeams('Smart irrigation monitoring'),
      apiGetCurrentUser()
    ]);

    setProblems(fetchedProblems);
    setPeople(fetchedProfiles);
    setProjects(fetchedProjects);
    setTeam(fetchedTeam);
    if (currentUser) {
      setUser(currentUser);
      setAccount(await apiGetAccount(currentUser));
    }

    if (creds.isConfigured) {
      const conn = await testConnection();
      setDbStatus({ isConfigured: true, connected: conn.success, message: conn.message });
    } else {
      setDbStatus({ isConfigured: false, connected: false, message: 'Running with local storage. Connect Supabase in Dashboard.' });
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleLogout = async () => {
    await apiSignOut();
    setUser(null);
    setAccount(null);
    setPage('home');
  };

  // Analysis: instant local match, then Gemini
  const analyze = async (customProblem) => {
    const pText = customProblem || problem || demoProblem;
    setProblem(pText);
    setAnalyzed(true);
    setAnalyzing(true);
    setPage('analysis');

    // 1) Instant result from local skill matching (people show up immediately)
    setAiResult(getQuickAnalysis(pText, people));
    // 2) Gemini refines it a few seconds later
    const result = await analyzeProblemWithAI(pText, people);
    setAiResult(result);
    setAnalyzing(false);
    // each project keeps its own team
    setTeam(await apiGetTeams(result?.title || 'Untitled project'));

    // Save problem to database if custom
    if (pText && !problems.some(p => p.title.toLowerCase() === (result?.title || pText).toLowerCase().slice(0, 30))) {
      const newProblemObj = {
        title: result?.title || (pText.slice(0, 45) + (pText.length > 45 ? '...' : '')),
        description: pText,
        domain: result?.domain || 'General',
        skills: result?.skillsNeeded ? result.skillsNeeded.map(s => s.name) : ['React', 'Backend'],
        budget: result?.estimatedCost || '₹2,000',
        timeline: result?.timeline || '4 weeks',
        user_id: user?.id
      };
      const saved = await apiAddProblem(newProblemObj);
      setProblems(prev => [saved, ...prev.filter(p => p.id !== saved.id)]);
    }
  };

  const add = async (p) => {
    if (!team.includes(p.name)) {
      const updated = await apiSaveTeamMember(aiResult?.title || 'Smart irrigation monitoring', p.name, p.role);
      setTeam(updated);
    }
  };

  return (
    <div className="app">
      <header className="nav">
        <div className="brand" onClick={() => setPage('home')}>
          <span className="logo"><Sparkles size={18} /></span>
          <span>Problem<span className="accent">2</span>Solution</span>
        </div>
        <nav className={menu ? 'open' : ''}>
          <button onClick={() => { setPage('home'); setMenu(false); }}>Home</button>
          <button onClick={() => { setPage('problems'); setMenu(false); }}>Problems</button>
          <button onClick={() => { setPage('people'); setMenu(false); }}>People</button>
          <button onClick={() => { setPage('projects'); setMenu(false); }}>Projects</button>
        </nav>
        <div className="navright">
          <button className="iconbtn" onClick={() => setPage('problems')} title="Search"><Search size={18} /></button>
          {user ? (
            <div className="userDropdown">
              <button className="adminPanelBtn" onClick={() => setPage(HOME_FOR_ROLE[account?.role] || 'account')} title="Open your dashboard">
                <Layers size={14} /> {account?.role === 'admin' ? 'Admin' : account?.role === 'talent' ? 'My profile' : 'My account'}
              </button>
              <span className="userNavBadge" onClick={() => setPage(HOME_FOR_ROLE[account?.role] || 'account')} style={{ cursor: 'pointer' }} title={user.email}>
                <span className="avatarSmall">{user.email ? user.email[0].toUpperCase() : 'U'}</span>
                {user.email ? user.email.split('@')[0] : 'Account'}
              </span>
              <button className="logoutBtn" onClick={handleLogout} title="Sign Out">
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <button className="loginNavBtn" onClick={() => setPage('login')}>
              <LogIn size={14} /> Login
            </button>
          )}
          <button className="mobilemenu" onClick={() => setMenu(!menu)}><Menu size={20} /></button>
        </div>
      </header>

      {page === 'home' && (
        <Home
          onAnalyze={() => setPage('submit')}
          onDemo={() => analyze(demoProblem)}
          demoProblem={problems[0] || null}
        />
      )}

      {page === 'submit' && (
        <Submit
          problem={problem}
          setProblem={setProblem}
          analyze={() => analyze(problem)}
        />
      )}

      {page === 'analysis' && (
        <Analysis
          problem={problem || demoProblem}
          people={people}
          add={add}
          team={team}
          onTeam={() => setPage('team')}
          onProject={() => setPage('project')}
          aiResult={aiResult}
          analyzing={analyzing}
          onContact={setContactPerson}
        />
      )}

      {page === 'team' && (
        <Team
          people={people}
          team={team}
          add={add}
          onBack={() => setPage('analysis')}
          onProject={() => setPage('project')}
          aiResult={aiResult}
          onContact={setContactPerson}
        />
      )}

      {page === 'project' && (
        <Project
          team={team}
          project={currentProject || projects[0]}
          onBack={() => setPage('analysis')}
          aiResult={aiResult}
        />
      )}

      {(page === 'people' || page === 'problems' || page === 'projects') && (
        <Directory
          page={page}
          problems={problems}
          people={people}
          projects={projects}
          onAnalyze={(p) => analyze(p.description || p.title)}
          onContact={setContactPerson}
          onJoinTalent={() => setPage(user ? (HOME_FOR_ROLE[account?.role] || 'account') : 'talent')}
          onViewProject={(proj) => {
            setCurrentProject(proj);
            setPage('project');
          }}
        />
      )}

      {page === 'login' && (
        <LoginPortal
          onLoggedIn={(loggedUser, acc) => {
            setUser(loggedUser);
            setAccount(acc);
            setPage(HOME_FOR_ROLE[acc?.role] || 'account');
          }}
        />
      )}

      {page === 'admin' && (
        user && account?.role === 'admin' ? (
          <Dashboard
            problems={problems}
            setProblems={setProblems}
            people={people}
            setPeople={setPeople}
            projects={projects}
            setProjects={setProjects}
            dbStatus={dbStatus}
            setDbStatus={setDbStatus}
            refreshAll={loadData}
            currentUser={user}
            onLogout={handleLogout}
          />
        ) : user ? (
          <NoAccess role={account?.role} onGo={() => setPage(HOME_FOR_ROLE[account?.role] || 'account')} />
        ) : (
          <LoginPortal initialPortal="admin" onLoggedIn={(u, acc) => { setUser(u); setAccount(acc); setPage(HOME_FOR_ROLE[acc?.role] || 'account'); }} />
        )
      )}

      {page === 'talent' && (
        user && (account?.role === 'talent' || account?.role === 'admin') ? (
          <TalentDashboard user={user} account={account} onLogout={handleLogout} onProfilesChanged={loadData} />
        ) : user ? (
          <NoAccess role={account?.role} onGo={() => setPage(HOME_FOR_ROLE[account?.role] || 'account')} />
        ) : (
          <LoginPortal initialPortal="talent" onLoggedIn={(u, acc) => { setUser(u); setAccount(acc); setPage(HOME_FOR_ROLE[acc?.role] || 'account'); }} />
        )
      )}

      {page === 'account' && (
        user ? (
          <UserDashboard
            user={user}
            account={account}
            onLogout={handleLogout}
            onNewProblem={() => setPage('submit')}
            onAnalyze={(p) => analyze(p.description || p.title)}
          />
        ) : (
          <LoginPortal initialPortal="user" onLoggedIn={(u, acc) => { setUser(u); setAccount(acc); setPage(HOME_FOR_ROLE[acc?.role] || 'account'); }} />
        )
      )}

      {contactPerson && (
        <ContactModal
          person={contactPerson}
          user={user}
          account={account}
          projectTitle={['analysis', 'team', 'project'].includes(page) ? aiResult?.title : ''}
          onClose={() => setContactPerson(null)}
        />
      )}

      <footer>
        <div><span className="logo small"><Sparkles size={14} /></span> Problem2Solution</div>
        <span>Team formation</span>
      </footer>
    </div>
  );
}

function NoAccess({ role, onGo }) {
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

function Home({ onAnalyze, onDemo, demoProblem: liveDemo }) {
  const demoTitle = liveDemo?.title || 'Smart irrigation for small farms';
  const demoDesc = liveDemo?.description || "Farmers waste water because they don't know when crops need irrigation.";
  const demoBudget = liveDemo?.budget || '₹1,200';
  const demoDomain = liveDemo?.domain || 'Agriculture · IoT';

  return (
    <main>
      <section className="hero">
        <h1>Turn problems into<br /><span>solutions.</span></h1>
        <p>Describe a real-world problem. AI identifies what you need, finds the right people, and helps you build the solution.</p>
        <div className="actions">
          <button className="primary" onClick={onAnalyze}>Analyze a Problem <ArrowRight size={17} /></button>
          <button className="secondary" onClick={onDemo}>Try a Demo</button>
        </div>
        <div className="flow">
          <Flow icon={<Brain />} title="Understand" /><ArrowRight />
          <Flow icon={<Target />} title="Find Skills" /><ArrowRight />
          <Flow icon={<Users />} title="Build Team" /><ArrowRight />
          <Flow icon={<Layers />} title="Create Solution" />
        </div>
      </section>

      <section className="demoCard">
        <div className="demoTop">
          <div>
            <span className="tag">LIVE EXAMPLE</span>
            <h2>{demoTitle}</h2>
            <p>{demoDesc}</p>
          </div>
          <div className="impact">High impact</div>
        </div>
        <div className="miniGrid">
          <Metric label="Domain" value={demoDomain} />
          <Metric label="Skills needed" value="5 skills" />
          <Metric label="Potential team" value="3 people" />
          <Metric label="Prototype cost" value={demoBudget} />
        </div>
        <button className="textbtn" onClick={onDemo}>See full AI analysis <ArrowRight size={16} /></button>
      </section>

      <section className="why">
        <div>
          <span className="tag">WHY IT'S DIFFERENT</span>
          <h2>Start with the problem,<br />not the person.</h2>
        </div>
        <p>Instead of asking “Who is available?”, Problem2Solution asks “What does this problem actually require?” Then it connects the missing skills to the right people.</p>
      </section>
    </main>
  );
}

function Flow({ icon, title }) {
  return <div className="flowItem"><span>{React.cloneElement(icon, { size: 17 })}</span><b>{title}</b></div>;
}

function Metric({ label, value }) {
  return <div><small>{label}</small><strong>{value}</strong></div>;
}

function Submit({ problem, setProblem, analyze }) {
  return (
    <main className="page">
      <div className="pageHead">
        <span className="eyebrow"><Sparkles size={15} /> AI analysis</span>
        <h1>What problem are you trying to solve?</h1>
        <p>Describe it naturally. AI breaks down the requirements and cost, and matches people who can build it.</p>
      </div>
      <div className="formCard">
        <label>Problem statement</label>
        <textarea
          value={problem}
          onChange={e => setProblem(e.target.value)}
          placeholder="Example: Farmers in rural areas waste water because they don't know when their crops need irrigation..."
        />
        <div className="hint"><Sparkles size={14} /> People are matched instantly; AI then adds the solution, cost, plan and skill gaps.</div>
        <div className="optional">
          <span>Optional details</span>
          <div>
            <input placeholder="Budget (e.g. ₹5,000)" />
            <input placeholder="Timeline (e.g. 4 weeks)" />
            <input placeholder="Target users" />
          </div>
        </div>
        <button className="primary wide" onClick={analyze}>
          Analyze
        </button>
      </div>
    </main>
  );
}

function Analysis({ problem, people, add, team, onTeam, onProject, aiResult, analyzing, onContact }) {
  if (analyzing && !aiResult) {
    return (
      <main className="page">
        <div className="aiLoadingBox">
          <div className="aiDot" style={{ width: 44, height: 44, margin: '0 auto 16px' }}>
            <Sparkles size={24} />
          </div>
          <h2 style={{ margin: '0 0 8px' }}>Analyzing...</h2>
          <p className="muted" style={{ maxWidth: 520, margin: '0 auto 16px', lineHeight: 1.6 }}>
            Deconstructing problem statement, extracting required skills, designing prototype architecture, and evaluating talent matches from the database in real-time...
          </p>
          <div className="statusDot" style={{ animation: 'pulse 1.5s infinite' }} />
        </div>
      </main>
    );
  }

  // Active analysis results
  const res = aiResult || {
    title: 'Smart irrigation for small farms',
    domain: 'Agriculture · IoT',
    difficulty: 'Intermediate',
    impact: 'High',
    estimatedCost: '₹1,000–₹1,500',
    timeline: '4 weeks',
    skillsNeeded: [
      { name: 'IoT', critical: true },
      { name: 'ESP32', critical: true },
      { name: 'Embedded C', critical: true },
      { name: 'React', critical: false },
      { name: 'Backend', critical: false }
    ],
    solution: {
      title: 'Smart irrigation monitoring',
      description: 'Use soil-moisture sensors connected to an ESP32. Send readings to a cloud database and display irrigation recommendations on a simple dashboard.',
      architecture: ['Soil sensor', 'ESP32', 'Cloud API', 'Dashboard']
    },
    skillGap: {
      coveredSkills: ['React', 'Node.js', 'Supabase'],
      missingSkills: ['IoT', 'Embedded C'],
      summary: 'IoT and Embedded C are the biggest gaps in your current team.'
    },
    matchedPeople: people.slice(0, 3).map((p, i) => ({
      name: p.name,
      role: p.role,
      matchScore: p.match || 92 - i * 4,
      matchReason: `High proficiency in ${Array.isArray(p.skills) ? p.skills.join(', ') : p.skills}`
    }))
  };

  // Reconcile matches with real database people (and show which needed skills each person has)
  const localScores = new Map(scorePeople(res.skillsNeeded, people).map(p => [p.name.toLowerCase(), p]));
  const rankedPeople = (res.matchedPeople || []).map(mp => {
    const found = people.find(p => p.name.toLowerCase() === mp.name.toLowerCase());
    return found
      ? { ...found, match: mp.matchScore || mp.match || found.match, matchReason: mp.matchReason, matchedSkills: localScores.get(found.name.toLowerCase())?.matchedSkills || [] }
      : {
          id: mp.name,
          name: mp.name,
          role: mp.role || 'Specialist',
          skills: ['Specialized Capability'],
          initials: mp.name.split(' ').map(x => x[0]).join('').slice(0, 2).toUpperCase(),
          match: mp.matchScore || 85,
          matchReason: mp.matchReason
        };
  });

  return (
    <main className="page">
      <div className="analysisTop">
        <div>
          <span className="eyebrow">
            <Sparkles size={15} /> Analysis
          </span>
          <h1>{res.title || 'Solution Blueprint'}</h1>
          <p>{problem}</p>
          {analyzing && (
            <p className="banner info">
              <Sparkles size={15} /> People matched instantly from the database. Preparing the full solution, cost and plan…
            </p>
          )}
          {!analyzing && aiResult && !aiResult.isAI && (
            <p className="banner warn">
              <AlertTriangle size={15} /> AI couldn't respond{aiResult.aiError ? ` (${aiResult.aiError})` : ''}. Showing skill-based matches from the database instead.
            </p>
          )}
        </div>
        <button className="secondary" onClick={onProject}>Generate project <ArrowRight size={16} /></button>
      </div>

      <div className="stats">
        <Metric label="Domain" value={res.domain || 'Technology'} />
        <Metric label="Difficulty" value={res.difficulty || 'Intermediate'} />
        <Metric label="Impact" value={res.impact || 'High'} />
        <Metric label="Estimated cost" value={res.estimatedCost || '—'} />
      </div>

      <div className="analysisGrid">
        <div className="leftCol">
          <Card title="Skills needed" icon={<Target size={17} />}>
            <div className="chips">
              {(res.skillsNeeded || []).map((s, i) => {
                const name = typeof s === 'string' ? s : s.name;
                const isCrit = typeof s === 'object' ? s.critical : i < 3;
                return (
                  <span className={isCrit ? 'chip critical' : 'chip'} key={name}>
                    {name}<small>{isCrit ? 'Critical' : 'Useful'}</small>
                  </span>
                );
              })}
            </div>
          </Card>

          <Card title="Recommended solution" icon={<Sparkles size={17} />}>
            <div className="solution">
              <div className="solutionTitle">{res.solution?.title || 'Proposed Prototype'}</div>
              <p>{res.solution?.description || (analyzing ? 'Designing the solution…' : 'Describe the problem in more detail for a full solution.')}</p>
              <div className="arch">
                {(res.solution?.architecture || []).map((step, idx, arr) => (
                  <React.Fragment key={step}>
                    <span>{step}</span>
                    {idx < arr.length - 1 && <ArrowRight />}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </Card>

          <Card title="Suggested tasks" icon={<Layers size={17} />}>
            {(res.nextTasks || []).length === 0 && <p className="muted">{analyzing ? 'Planning the steps…' : 'No tasks yet.'}</p>}
            {(res.nextTasks || []).map((t, idx) => (
              <Similar key={idx} title={t} sim={`Step ${idx + 1}`} />
            ))}
          </Card>
        </div>

        <div className="rightCol">
          <Card title="Skill gap analysis" icon={<AlertTriangle size={17} />}>
            <div className="gap">
              <div className="gapRow">
                {(res.skillGap?.coveredSkills || []).map(cs => (
                  <span key={cs}><Check size={15} /> {cs}</span>
                ))}
              </div>
              <div className="missing">
                <AlertTriangle size={15} />
                <b>Missing Skill Requirements</b>
                <p>{res.skillGap?.summary || ''}</p>
                <button className="textbtn" onClick={onTeam}>Find people <ArrowRight size={15} /></button>
              </div>
            </div>
          </Card>

          <Card title={`People who can build this (${rankedPeople.length} found)`} icon={<Users size={17} />}>
            <div className="peopleList">
              {rankedPeople.length === 0 && <p className="muted">No matching people in the database yet.</p>}
              {rankedPeople.slice(0, 5).map(p => (
                <div key={p.name}>
                  <Person p={p} add={add} inTeam={team.includes(p.name)} onContact={onContact} />
                </div>
              ))}
            </div>
            <button className="secondary wide" onClick={onTeam} style={{ marginTop: 12 }}>
              Build my team <Users size={16} />
            </button>
          </Card>

          <Card title="Prototype estimate" icon={<IndianRupee size={17} />}>
            <div className="estimate">
              <b>{res.estimatedCost || '—'}</b>
              <span>Estimated cost of a first working version</span>
            </div>
            <div className="estimate">
              <b>{res.timeline || '—'}</b>
              <span>Estimated time to build</span>
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}

function Card({ title, icon, children }) {
  return (
    <section className="card">
      <div className="cardTitle"><span className="cardIcon">{icon}</span><h3>{title}</h3></div>
      {children}
    </section>
  );
}

function Similar({ title, sim }) {
  return (
    <div className="similar">
      <div><b>{title}</b></div>
      <strong>{sim}</strong>
    </div>
  );
}

function Person({ p, add, inTeam, onContact }) {
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

function Team({ people, team, add, onBack, onProject, aiResult, onContact }) {
  const needed = aiResult?.skillsNeeded || [];
  const local = scorePeople(needed, people);
  const aiScore = new Map((aiResult?.matchedPeople || []).map(m => [m.name.toLowerCase(), m.matchScore]));
  const ranked = local
    .map(p => ({ ...p, match: aiScore.get(p.name.toLowerCase()) || p.match }))
    .sort((a, b) => b.match - a.match);
  const teamPeople = people.filter(p => team.includes(p.name));
  const teamSkills = new Set(teamPeople.flatMap(p => (Array.isArray(p.skills) ? p.skills : []).map(normSkill)));
  const coverage = needed.map(s => {
    const n = normSkill(s.name);
    const covered = teamSkills.has(n) || scorePeople([s], teamPeople).length > 0;
    return { name: s.name, covered };
  });

  return (
    <main className="page">
      <div className="analysisTop">
        <div>
          <button className="back" onClick={onBack}>← Back</button>
          <span className="eyebrow"><Users size={15} /> Team builder</span>
          <h1>Build your team</h1>
          <p>AI identified the skills required for this problem. Add people to cover the gaps.</p>
        </div>
        <button className="primary" onClick={onProject}>Create project <ArrowRight size={16} /></button>
      </div>
      <div className="teamLayout">
        <section className="card">
          <div className="cardTitle">
            <h3>Recommended talent pool</h3>
            <span className="count">{ranked.length} candidates</span>
          </div>
          {ranked.length === 0 && <p className="muted">Analyze a problem first to see matching people.</p>}
          {ranked.map(p => (
            <Person p={p} add={add} inTeam={team.includes(p.name)} onContact={onContact} key={p.id || p.name} />
          ))}
        </section>
        <section className="card sticky">
          <div className="cardTitle">
            <h3>Your team</h3>
            <span className="count">{team.length} members</span>
          </div>
          {team.length === 0 ? (
            <div className="empty">
              <Users size={28} />
              <b>No members yet</b>
              <span>Add recommended people to build your team.</span>
            </div>
          ) : (
            team.map(n => (
              <div className="selected" key={n}>
                <div className="personAvatar">{n.split(' ').map(x => x[0]).join('')}</div>
                <div><b>{n}</b><span>{people.find(p => p.name === n)?.role || 'Team member'}</span></div>
                <Check size={17} />
              </div>
            ))
          )}
          <div className="coverage">
            <b>Skill coverage ({coverage.filter(c => c.covered).length}/{coverage.length})</b>
            {coverage.map(c => (
              <div key={c.name}><span>{c.name}</span><i className={c.covered ? 'full' : ''} /></div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function Project({ team, project, onBack, aiResult }) {
  const current = project || {
    title: aiResult?.title || 'Smart irrigation monitoring',
    description: aiResult?.solution?.description || 'Build an automated prototype solution.',
    timeline: aiResult?.timeline || '4 weeks',
    budget: aiResult?.estimatedCost || '₹1,200',
    progress: 35
  };

  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { sender: 'assistant', text: 'Hi! I am your AI project assistant. Ask me anything about how to build this project — tools, code, design or setup.' }
  ]);
  const [chatLoading, setChatLoading] = useState(false);

  const handleSendChat = async (e) => {
    e?.preventDefault();
    if (!chatInput.trim() || chatLoading) return;
    const msg = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { sender: 'user', text: msg }]);
    setChatLoading(true);

    const reply = await askProjectAssistant(msg, current);
    setChatMessages(prev => [...prev, { sender: 'assistant', text: reply }]);
    setChatLoading(false);
  };

  return (
    <main className="page">
      <button className="back" onClick={onBack}>← Back to analysis</button>
      <div className="projectHead">
        <div>
          <span className="eyebrow"><Zap size={15} /> Project workspace</span>
          <h1>{current.title}</h1>
          <p>{current.description}</p>
        </div>
        <span className="progressBadge">{current.progress || 35}% complete</span>
      </div>
      <div className="projectGrid">
        <Card title="Overview" icon={<Layers size={17} />}>
          <p className="muted">{current.description}</p>
          <div className="miniGrid">
            <Metric label="Team" value={team.length || 3} />
            <Metric label="Timeline" value={current.timeline || '4 weeks'} />
            <Metric label="Budget" value={current.budget || '₹1,200'} />
          </div>
        </Card>

        <Card title="Next tasks" icon={<CircleCheck size={17} />}>
          {(aiResult?.nextTasks || [
            'Define requirements and pinout connections',
            'Choose microcontroller and sensors',
            'Create Supabase database tables',
            'Connect device telemetry to API',
            'Build frontend dashboard'
          ]).map((taskText, idx) => (
            <Task key={idx} done={idx < 2} text={taskText} />
          ))}
        </Card>

        <Card title="AI Project Assistant" icon={<Bot size={17} />}>
          <div className="chatHistoryBox">
            {chatMessages.map((m, i) => (
              <div key={i} className={`chatMsg ${m.sender}`}>
                {m.text}
              </div>
            ))}
            {chatLoading && <div className="chatMsg assistant">Thinking...</div>}
          </div>

          <form onSubmit={handleSendChat} className="chatInput">
            <input
              placeholder="Ask how to connect sensor, write SQL, build UI..."
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              disabled={chatLoading}
            />
            <button type="submit" disabled={chatLoading || !chatInput.trim()}>
              <Send size={13} />
            </button>
          </form>
        </Card>

        <Card title="Architecture Pipeline" icon={<Layers size={17} />}>
          <div className="arch big">
            {(aiResult?.solution?.architecture || ['Soil moisture', 'ESP32', 'API', 'Supabase', 'React']).map((step, idx, arr) => (
              <React.Fragment key={step}>
                <span>{step}</span>
                {idx < arr.length - 1 && <ArrowRight />}
              </React.Fragment>
            ))}
          </div>
        </Card>
      </div>
    </main>
  );
}

function Task({ done, text }) {
  return (
    <div className="task">
      <span className={done ? 'checkbox done' : 'checkbox'}>{done && <Check size={12} />}</span>
      <span>{text}</span>
    </div>
  );
}

function Directory({ page, problems, people, projects, onAnalyze, onViewProject, onJoinTalent, onContact }) {
  const [search, setSearch] = useState('');
  const [openPerson, setOpenPerson] = useState(null);

  const title = page === 'people'
    ? 'Find people with the skills you need'
    : page === 'problems'
    ? 'Explore problems worth solving'
    : 'Projects built from real-world problems';

  const filterText = search.toLowerCase();

  // Understands needs like "website", "logo", "marketing", or a city name
  const filteredPeople = searchPeople(search, people);

  const filteredProblems = problems.filter(pr =>
    pr.title.toLowerCase().includes(filterText) ||
    (pr.description || '').toLowerCase().includes(filterText) ||
    (pr.domain || '').toLowerCase().includes(filterText)
  );

  const filteredProjects = projects.filter(pj =>
    pj.title.toLowerCase().includes(filterText) ||
    (pj.description || '').toLowerCase().includes(filterText) ||
    (pj.domain || '').toLowerCase().includes(filterText)
  );

  return (
    <main className="page">
      <div className="pageHead">
        <span className="eyebrow"><Sparkles size={15} /> Discover</span>
        <h1>{title}</h1>
        <p>Explore the community and find opportunities to collaborate.</p>
        {page === 'people' && onJoinTalent && (
          <button className="secondary" style={{ marginTop: 12 }} onClick={onJoinTalent}>
            <Plus size={15} /> Are you a developer, designer or marketer? Add your profile
          </button>
        )}
      </div>
      <div className="searchBar">
        <Search size={18} />
        <input
          placeholder={page === 'people' ? 'What do you need? e.g. website, logo, Instagram marketing, Flutter, Hyderabad' : 'Search problems, skills, people or projects...'}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {page === 'people' && (
        <div className="directoryGrid">
          {filteredPeople.map(p => (
            <div className="card profileCard" key={p.id || p.name}>
              <div className="personAvatar large">{p.initials || p.name.slice(0, 2).toUpperCase()}</div>
              <h3>{p.name}</h3>
              <span>{p.role}</span>
              {p.bio && <p className="muted" style={{ fontSize: 13, margin: '8px 0' }}>{p.bio}</p>}
              <div className="chips">
                {(Array.isArray(p.skills) ? p.skills : (p.skills ? p.skills.split(',') : [])).map(s => (
                  <span className={(p.matchedSkills || []).some(m => normSkill(m) === normSkill(s.trim())) ? 'smallChip hit' : 'smallChip'} key={s.trim()}>{s.trim()}</span>
                ))}
              </div>
              <div className="cardActions">
                <button className="secondary" onClick={() => setOpenPerson(p)}>Profile & work <ChevronRight size={15} /></button>
                <button className="primary" onClick={() => onContact(p)}><MessageCircle size={15} /> Contact</button>
              </div>
            </div>
          ))}
          {filteredPeople.length === 0 && <p className="muted">No one found for "{search}". Try a skill (React, logo, marketing) or a city.</p>}
        </div>
      )}

      {openPerson && <ProfileModal person={openPerson} onClose={() => setOpenPerson(null)} onContact={(p) => { setOpenPerson(null); onContact(p); }} />}

      {page === 'problems' && (
        <div className="directoryGrid">
          {filteredProblems.map(x => (
            <div className="card problemCard" key={x.id || x.title}>
              <span className="tag">{x.domain || 'General'}</span>
              <h3>{x.title}</h3>
              <p>{x.description}</p>
              <div className="problemMeta">
                <span><Users size={14} /> {Array.isArray(x.skills) ? x.skills.length : 3} skills</span>
                <span><Clock size={14} /> {x.timeline || '4 weeks'}</span>
              </div>
              <button className="textbtn" onClick={() => onAnalyze(x)}>
                Analyze problem <ArrowRight size={15} />
              </button>
            </div>
          ))}
          {filteredProblems.length === 0 && <p className="muted">No problems found matching your search.</p>}
        </div>
      )}

      {page === 'projects' && (
        <div className="directoryGrid">
          {filteredProjects.map(proj => (
            <div className="card problemCard" key={proj.id || proj.title}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="tag">{proj.domain || 'Technology'}</span>
                <span className="progressBadge">{proj.progress || 10}% done</span>
              </div>
              <h3>{proj.title}</h3>
              <p>{proj.description}</p>
              <div className="chips" style={{ margin: '10px 0' }}>
                {(Array.isArray(proj.skills) ? proj.skills : (proj.skills ? proj.skills.split(',') : [])).map(s => (
                  <span className="smallChip" key={s.trim()}>{s.trim()}</span>
                ))}
              </div>
              <div className="problemMeta">
                <span><Clock size={14} /> {proj.timeline || '4 weeks'}</span>
                <span><IndianRupee size={14} /> {proj.budget || '₹1,200'}</span>
              </div>
              <button className="textbtn" onClick={() => onViewProject(proj)}>
                Open workspace <ArrowRight size={15} />
              </button>
            </div>
          ))}
          {filteredProjects.length === 0 && <p className="muted">No projects found matching your search.</p>}
        </div>
      )}
    </main>
  );
}

// =========================================================
// DASHBOARD (Upload Projects, Team Members, Supabase & Gemini AI)
// =========================================================
function Dashboard({ problems, setProblems, people, setPeople, projects, setProjects, dbStatus, setDbStatus, refreshAll, currentUser, onLogout }) {
  const [activeTab, setActiveTab] = useState('team');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState('');

  // Project Form
  const [newProject, setNewProject] = useState({
    title: '',
    domain: 'Agriculture · IoT',
    description: '',
    skills: 'ESP32, React, APIs, Supabase',
    budget: '₹1,500',
    timeline: '4 weeks',
    progress: 25
  });

  // Team Member Form
  const [newMember, setNewMember] = useState({
    name: '',
    role: '',
    skills: '',
    initials: '',
    match: 85,
    city: '',
    experience: 2,
    about: ''
  });

  // Problem Form
  const [newProblem, setNewProblem] = useState({
    title: '',
    domain: 'Environment',
    description: '',
    skills: 'Sensors, Python, React',
    budget: '₹2,000',
    timeline: '4 weeks'
  });

  // Supabase Credentials Form
  const initialCreds = getCredentials();
  const [supabaseUrl, setSupabaseUrl] = useState(initialCreds.url);
  const [supabaseKey, setSupabaseKey] = useState(initialCreds.key);
  const [testingDb, setTestingDb] = useState(false);

  // Gemini AI Key Form
  const [geminiKeyInput, setGeminiKeyInput] = useState(getGeminiKey());
  const [testingGemini, setTestingGemini] = useState(false);
  const [geminiMsg, setGeminiMsg] = useState('');

  const showNotice = (msg) => {
    setNotice(msg);
    setTimeout(() => setNotice(''), 4500);
  };

  // Upload Project Handler
  const handleAddProject = async (e) => {
    e.preventDefault();
    if (!newProject.title.trim()) return alert('Project title is required.');
    setIsSubmitting(true);
    try {
      const saved = await apiAddProject(newProject);
      setProjects(prev => [saved, ...prev]);
      setNewProject({
        title: '',
        domain: 'Technology',
        description: '',
        skills: 'React, Node.js',
        budget: '₹1,500',
        timeline: '4 weeks',
        progress: 10
      });
      showNotice('Project successfully uploaded to database!');
    } catch (err) {
      alert('Error adding project: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Project Handler
  const handleDeleteProject = async (id) => {
    if (!confirm('Are you sure you want to delete this project?')) return;
    try {
      await apiDeleteProject(id);
      setProjects(prev => prev.filter(p => p.id !== id));
      showNotice('Project deleted.');
    } catch (err) {
      alert('Could not delete: ' + err.message);
    }
  };

  // Upload Team Member Handler
  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!newMember.name.trim()) return alert('Name is required.');
    setIsSubmitting(true);
    try {
      const exp = Number(newMember.experience) || 0;
      const saved = await apiAddProfile({
        ...newMember,
        match: Math.min(95, 78 + exp * 2),
        bio: `${newMember.city || 'India'} · ${exp} yr${exp === 1 ? '' : 's'} experience · Available. ${newMember.about || ''}`.trim()
      });
      setPeople(prev => [saved, ...prev]);
      setNewMember({ name: '', role: '', skills: '', initials: '', match: 85, city: '', experience: 2, about: '' });
      showNotice(`${saved.name} added. They now appear in People and in matches.`);
    } catch (err) {
      alert('Error adding team member: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Team Member Handler
  const handleDeleteMember = async (id) => {
    const person = people.find(p => p.id === id);
    if (!confirm(`Delete ${person?.name || 'this person'} from the database? Their portfolio work is deleted too.`)) return;
    try {
      await apiDeleteProfile(id);
      setPeople(prev => prev.filter(p => p.id !== id));
      showNotice(`${person?.name || 'Person'} deleted.`);
    } catch (err) {
      alert('Could not delete: ' + err.message);
    }
  };

  // Upload Problem Handler
  const handleAddProblem = async (e) => {
    e.preventDefault();
    if (!newProblem.title.trim()) return alert('Title is required.');
    setIsSubmitting(true);
    try {
      const saved = await apiAddProblem(newProblem);
      setProblems(prev => [saved, ...prev]);
      setNewProblem({
        title: '',
        domain: 'Environment',
        description: '',
        skills: 'Python, React',
        budget: '₹2,000',
        timeline: '4 weeks'
      });
      showNotice('Problem successfully posted to database!');
    } catch (err) {
      alert('Error adding problem: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Problem Handler
  const handleDeleteProblem = async (id) => {
    if (!confirm('Are you sure you want to delete this problem?')) return;
    try {
      await apiDeleteProblem(id);
      setProblems(prev => prev.filter(p => p.id !== id));
      showNotice('Problem deleted.');
    } catch (err) {
      alert('Could not delete: ' + err.message);
    }
  };

  // Save and Test Supabase Credentials
  const handleSaveCredentials = async (e) => {
    e.preventDefault();
    setTestingDb(true);
    saveCredentials(supabaseUrl, supabaseKey);
    const conn = await testConnection();
    setDbStatus({
      isConfigured: Boolean(supabaseUrl && supabaseKey),
      connected: conn.success,
      message: conn.message
    });
    setTestingDb(false);
    if (conn.success) {
      showNotice('Supabase credentials verified & connected!');
      refreshAll();
    } else {
      alert(conn.message);
    }
  };

  // Save and Test Gemini Key
  const handleSaveGeminiKey = async (e) => {
    e.preventDefault();
    setTestingGemini(true);
    setGeminiMsg('');
    saveGeminiKey(geminiKeyInput);
    const res = await testGeminiApiKey(geminiKeyInput);
    setTestingGemini(false);
    setGeminiMsg(res.message);
    if (res.success) {
      showNotice('AI API key verified!');
    }
  };

  return (
    <main className="page">
      <div className="adminHeader">
        <div>
          <span className="eyebrow"><Shield size={15} /> Admin dashboard</span>
          <h1>Admin dashboard</h1>
          <p>
            Signed in as <b>{currentUser?.email || 'Admin'}</b>. Add or remove people, problems and projects, and manage user roles.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="secondary" onClick={refreshAll} title="Refresh data from database">
            <RefreshCw size={15} /> Sync Database
          </button>
          <button className="dangerBtn" onClick={onLogout} title="Log out">
            <LogOut size={15} /> Sign Out
          </button>
        </div>
      </div>

      {notice && (
        <div className="statusBanner connected" style={{ marginBottom: 16 }}>
          <span><CheckCircle2 size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />{notice}</span>
        </div>
      )}

      {/* Supabase Status Banner */}
      <div className={`statusBanner ${dbStatus.connected ? 'connected' : 'disconnected'}`}>
        <div>
          <span className="statusDot" />
          <strong>Database Status:</strong> {dbStatus.connected ? 'Connected to Supabase Cloud' : (dbStatus.isConfigured ? 'Supabase Configured (Checking tables)' : 'Running with Local Storage (Offline fallback active)')}
          <div style={{ fontSize: 11, opacity: 0.85, marginTop: 4 }}>
            {dbStatus.message || (dbStatus.connected ? 'Real-time PostgreSQL database active' : 'Click the Database tab to connect your Supabase project URL & Anon Key.')}
          </div>
        </div>
        <button className="secondary" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => setActiveTab('database')}>
          <Database size={13} /> {dbStatus.connected ? 'Configure Connection' : 'Connect Supabase'}
        </button>
      </div>

      {/* Dashboard Tabs */}
      <div className="adminTabs">
        <button className={`adminTab ${activeTab === 'projects' ? 'active' : ''}`} onClick={() => setActiveTab('projects')}>
          <Layers size={16} /> Projects <span className="badge">{projects.length}</span>
        </button>
        <button className={`adminTab ${activeTab === 'team' ? 'active' : ''}`} onClick={() => setActiveTab('team')}>
          <Users size={16} /> People <span className="badge">{people.length}</span>
        </button>
        <button className={`adminTab ${activeTab === 'problems' ? 'active' : ''}`} onClick={() => setActiveTab('problems')}>
          <Target size={16} /> Problems <span className="badge">{problems.length}</span>
        </button>
        <button className={`adminTab ${activeTab === 'messages' ? 'active' : ''}`} onClick={() => setActiveTab('messages')}>
          <MessageCircle size={16} /> Messages
        </button>
        <button className={`adminTab ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
          <Shield size={16} /> Users & roles
        </button>
        <button className={`adminTab ${activeTab === 'gemini' ? 'active' : ''}`} onClick={() => setActiveTab('gemini')}>
          <Bot size={16} /> AI settings
        </button>
        <button className={`adminTab ${activeTab === 'database' ? 'active' : ''}`} onClick={() => setActiveTab('database')}>
          <Database size={16} /> Database
        </button>
      </div>

      {activeTab === 'users' && <AdminUsersTab currentUserId={currentUser?.id} />}
      {activeTab === 'messages' && <MessagesCard title="All messages sent through the site" />}

      {/* TAB 1: PROJECTS */}
      {activeTab === 'projects' && (
        <div className="adminGrid">
          <section className="card">
            <div className="cardTitle">
              <span className="cardIcon"><Upload size={17} /></span>
              <h3>Upload New Project</h3>
            </div>
            <form onSubmit={handleAddProject} className="adminForm">
              <label>
                Project Title
                <input
                  required
                  placeholder="e.g. Smart IoT Soil Monitoring"
                  value={newProject.title}
                  onChange={e => setNewProject({ ...newProject, title: e.target.value })}
                />
              </label>

              <div className="formRow">
                <label>
                  Domain
                  <input
                    placeholder="e.g. Agriculture · IoT"
                    value={newProject.domain}
                    onChange={e => setNewProject({ ...newProject, domain: e.target.value })}
                  />
                </label>
                <label>
                  Initial Progress %
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={newProject.progress}
                    onChange={e => setNewProject({ ...newProject, progress: e.target.value })}
                  />
                </label>
              </div>

              <label>
                Description
                <textarea
                  required
                  placeholder="Describe the solution being built, hardware and software components..."
                  value={newProject.description}
                  onChange={e => setNewProject({ ...newProject, description: e.target.value })}
                />
              </label>

              <label>
                Required Skills (comma-separated)
                <input
                  placeholder="e.g. ESP32, React, Supabase, Embedded C"
                  value={newProject.skills}
                  onChange={e => setNewProject({ ...newProject, skills: e.target.value })}
                />
              </label>

              <div className="formRow">
                <label>
                  Budget Estimate
                  <input
                    placeholder="e.g. ₹1,500"
                    value={newProject.budget}
                    onChange={e => setNewProject({ ...newProject, budget: e.target.value })}
                  />
                </label>
                <label>
                  Timeline
                  <input
                    placeholder="e.g. 4 weeks"
                    value={newProject.timeline}
                    onChange={e => setNewProject({ ...newProject, timeline: e.target.value })}
                  />
                </label>
              </div>

              <button className="primary" type="submit" disabled={isSubmitting}>
                <Upload size={16} /> {isSubmitting ? 'Uploading...' : 'Publish Project'}
              </button>
            </form>
          </section>

          <section className="card">
            <div className="cardTitle">
              <span className="cardIcon"><Layers size={17} /></span>
              <h3>Current Projects ({projects.length})</h3>
            </div>
            <div className="itemList">
              {projects.map(proj => (
                <div className="itemCard" key={proj.id || proj.title}>
                  <div>
                    <h4>{proj.title}</h4>
                    <p>{proj.description}</p>
                    <div className="itemMeta">
                      <span className="itemTag">{proj.domain || 'Technology'}</span>
                      <span>Progress: <b>{proj.progress || 10}%</b></span>
                      <span>Budget: <b>{proj.budget || '₹1,200'}</b></span>
                    </div>
                  </div>
                  <button className="dangerBtn" onClick={() => handleDeleteProject(proj.id)} title="Delete project">
                    <Trash2 size={13} /> Delete
                  </button>
                </div>
              ))}
              {projects.length === 0 && <p className="muted">No projects uploaded yet.</p>}
            </div>
          </section>
        </div>
      )}

      {/* TAB 2: TEAM MEMBERS */}
      {activeTab === 'team' && (
        <div className="adminGrid">
          <section className="card">
            <div className="cardTitle">
              <span className="cardIcon"><Upload size={17} /></span>
              <h3>Add a person</h3>
            </div>
            <form onSubmit={handleAddMember} className="adminForm">
              <label>
                Full Name
                <input
                  required
                  placeholder="e.g. Priya Sharma"
                  value={newMember.name}
                  onChange={e => setNewMember({
                    ...newMember,
                    name: e.target.value,
                    initials: e.target.value.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                  })}
                />
              </label>

              <div className="formRow">
                <label>
                  Role / Specialization
                  <input
                    required
                    placeholder="e.g. Embedded Firmware Engineer"
                    value={newMember.role}
                    onChange={e => setNewMember({ ...newMember, role: e.target.value })}
                  />
                </label>
                <label>
                  Initials
                  <input
                    placeholder="e.g. PS"
                    value={newMember.initials}
                    onChange={e => setNewMember({ ...newMember, initials: e.target.value })}
                  />
                </label>
              </div>

              <label>
                Skills (comma-separated)
                <input
                  required
                  placeholder="e.g. ESP32, C++, PCB Design, MQTT"
                  value={newMember.skills}
                  onChange={e => setNewMember({ ...newMember, skills: e.target.value })}
                />
              </label>

              <div className="formRow">
                <label>
                  City
                  <input placeholder="e.g. Hyderabad" value={newMember.city} onChange={e => setNewMember({ ...newMember, city: e.target.value })} />
                </label>
                <label>
                  Years of experience
                  <input type="number" min="0" max="40" value={newMember.experience} onChange={e => setNewMember({ ...newMember, experience: e.target.value })} />
                </label>
              </div>

              <label>
                About (one line)
                <input placeholder="e.g. Builds online stores for small shops" value={newMember.about} onChange={e => setNewMember({ ...newMember, about: e.target.value })} />
              </label>

              <button className="primary" type="submit" disabled={isSubmitting}>
                <Plus size={16} /> {isSubmitting ? 'Adding...' : 'Add person'}
              </button>
            </form>
          </section>

          <section className="card">
            <div className="cardTitle">
              <span className="cardIcon"><Users size={17} /></span>
              <h3>People in the database ({people.length})</h3>
            </div>
            <div className="itemList">
              {people.map(person => (
                <div className="itemCard" key={person.id || person.name}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div className="personAvatar large" style={{ margin: 0, width: 42, height: 42 }}>
                      {person.initials || person.name?.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4>{person.name}</h4>
                      <p style={{ margin: '2px 0 6px', color: '#4f46e5', fontWeight: 500 }}>{person.role}</p>
                      <div className="chips">
                        {(Array.isArray(person.skills) ? person.skills : (person.skills ? person.skills.split(',') : [])).map(s => (
                          <span className="smallChip" key={s.trim()}>{s.trim()}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <button className="dangerBtn" onClick={() => handleDeleteMember(person.id)} title="Delete member">
                    <Trash2 size={13} /> Delete
                  </button>
                </div>
              ))}
              {people.length === 0 && <p className="muted">No team members added yet.</p>}
            </div>
          </section>
        </div>
      )}

      {/* TAB 3: PROBLEMS */}
      {activeTab === 'problems' && (
        <div className="adminGrid">
          <section className="card">
            <div className="cardTitle">
              <span className="cardIcon"><Upload size={17} /></span>
              <h3>Upload New Problem</h3>
            </div>
            <form onSubmit={handleAddProblem} className="adminForm">
              <label>
                Problem Title
                <input
                  required
                  placeholder="e.g. Village Groundwater Salinity Detection"
                  value={newProblem.title}
                  onChange={e => setNewProblem({ ...newProblem, title: e.target.value })}
                />
              </label>

              <div className="formRow">
                <label>
                  Domain
                  <input
                    placeholder="e.g. Clean Water · Environmental"
                    value={newProblem.domain}
                    onChange={e => setNewProblem({ ...newProblem, domain: e.target.value })}
                  />
                </label>
                <label>
                  Timeline
                  <input
                    placeholder="e.g. 6 weeks"
                    value={newProblem.timeline}
                    onChange={e => setNewProblem({ ...newProblem, timeline: e.target.value })}
                  />
                </label>
              </div>

              <label>
                Problem Statement / Description
                <textarea
                  required
                  placeholder="Detail the issue, who suffers from it, and what constraints exist..."
                  value={newProblem.description}
                  onChange={e => setNewProblem({ ...newProblem, description: e.target.value })}
                />
              </label>

              <label>
                Skills Needed (comma-separated)
                <input
                  placeholder="e.g. Water Sensors, Arduino, Cloud Dashboard"
                  value={newProblem.skills}
                  onChange={e => setNewProblem({ ...newProblem, skills: e.target.value })}
                />
              </label>

              <label>
                Estimated Budget
                <input
                  placeholder="e.g. ₹2,500"
                  value={newProblem.budget}
                  onChange={e => setNewProblem({ ...newProblem, budget: e.target.value })}
                />
              </label>

              <button className="primary" type="submit" disabled={isSubmitting}>
                <Plus size={16} /> {isSubmitting ? 'Posting...' : 'Post Problem to Database'}
              </button>
            </form>
          </section>

          <section className="card">
            <div className="cardTitle">
              <span className="cardIcon"><Target size={17} /></span>
              <h3>Problems in Database ({problems.length})</h3>
            </div>
            <div className="itemList">
              {problems.map(prob => (
                <div className="itemCard" key={prob.id || prob.title}>
                  <div>
                    <h4>{prob.title}</h4>
                    <p>{prob.description}</p>
                    <div className="itemMeta">
                      <span className="itemTag">{prob.domain || 'General'}</span>
                      <span>Budget: <b>{prob.budget || '₹2,000'}</b></span>
                      <span>Timeline: <b>{prob.timeline || '4 weeks'}</b></span>
                    </div>
                  </div>
                  <button className="dangerBtn" onClick={() => handleDeleteProblem(prob.id)} title="Delete problem">
                    <Trash2 size={13} /> Delete
                  </button>
                </div>
              ))}
              {problems.length === 0 && <p className="muted">No problems found.</p>}
            </div>
          </section>
        </div>
      )}

      {/* TAB 4: GEMINI AI */}
      {activeTab === 'gemini' && (
        <div className="adminGrid">
          <section className="card">
            <div className="cardTitle">
              <span className="cardIcon"><Bot size={17} /></span>
              <h3>AI configuration</h3>
            </div>
            <p className="muted" style={{ fontSize: 13, marginBottom: 16 }}>
              Problem2Solution uses <b>AI</b> for problem analysis, solution planning and talent matching.
            </p>

            <form onSubmit={handleSaveGeminiKey} className="adminForm">
              <label>
                AI API key
                <input
                  type="password"
                  required
                  placeholder="AIzaSy..."
                  value={geminiKeyInput}
                  onChange={e => setGeminiKeyInput(e.target.value)}
                />
              </label>

              {geminiMsg && (
                <div className={`authAlert ${geminiMsg.includes('Connected') || geminiMsg.includes('valid') ? 'success' : 'error'}`}>
                  {geminiMsg.includes('Connected') || geminiMsg.includes('valid') ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                  <span>{geminiMsg}</span>
                </div>
              )}

              <button className="primary" type="submit" disabled={testingGemini}>
                <Sparkles size={15} /> {testingGemini ? 'Testing…' : 'Save & test key'}
              </button>
            </form>

            <div style={{ marginTop: 20, fontSize: 12, color: '#6b7280' }}>
              Don't have a key yet? Get a free key at <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" style={{ color: '#4f46e5', fontWeight: 600 }}>Google AI Studio <ExternalLink size={12} /></a>.
            </div>
          </section>

          <section className="card">
            <div className="cardTitle">
              <span className="cardIcon"><Sparkles size={17} /></span>
              <h3>Real-Time AI Capabilities</h3>
            </div>
            <div className="guideSteps">
              <div className="guideStep">
                <span className="stepNumber">1</span>
                <div><b>Structured Problem Deconstruction:</b> Automatically extracts domain, timeline, difficulty, and budget estimates from plain natural language.</div>
              </div>
              <div className="guideStep">
                <span className="stepNumber">2</span>
                <div><b>Critical Skill Tagging:</b> Distinguishes between critical core requirements (e.g. ESP32, IoT) and useful supporting skills.</div>
              </div>
              <div className="guideStep">
                <span className="stepNumber">3</span>
                <div><b>Live Talent Matchmaking:</b> Ranks your real database talent pool with personalized fit percentages and match reasons.</div>
              </div>
              <div className="guideStep">
                <span className="stepNumber">4</span>
                <div><b>Interactive Prototype Assistant:</b> Interactive chat in the Project Workspace to guide hardware wiring and code generation.</div>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* TAB 5: DATABASE & SUPABASE SETUP */}
      {activeTab === 'database' && (
        <div className="adminGrid">
          <section className="card">
            <div className="cardTitle">
              <span className="cardIcon"><Database size={17} /></span>
              <h3>Supabase Cloud Credentials</h3>
            </div>
            <p className="muted" style={{ fontSize: 13, marginBottom: 16 }}>
              Enter your project URL and public Anon key from your Supabase dashboard (<strong>Project Settings &gt; API</strong>).
            </p>
            <form onSubmit={handleSaveCredentials} className="adminForm">
              <label>
                Supabase Project URL
                <input
                  required
                  placeholder="https://your-project.supabase.co"
                  value={supabaseUrl}
                  onChange={e => setSupabaseUrl(e.target.value)}
                />
              </label>

              <label>
                Supabase Anon Public API Key
                <input
                  required
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={supabaseKey}
                  onChange={e => setSupabaseKey(e.target.value)}
                />
              </label>

              <button className="primary" type="submit" disabled={testingDb}>
                <RefreshCw size={15} /> {testingDb ? 'Testing Connection...' : 'Save & Test Supabase Connection'}
              </button>
            </form>
          </section>

          <section className="card">
            <div className="cardTitle">
              <span className="cardIcon"><Shield size={17} /></span>
              <h3>One-Time Supabase SQL Setup</h3>
            </div>
            <div className="guideSteps">
              <div className="guideStep">
                <span className="stepNumber">1</span>
                <div>Create a free project at <a href="https://supabase.com" target="_blank" rel="noreferrer" style={{ color: '#4f46e5' }}>supabase.com <ExternalLink size={12} /></a></div>
              </div>
              <div className="guideStep">
                <span className="stepNumber">2</span>
                <div>Go to <strong>SQL Editor</strong> &gt; <strong>New Query</strong> in your Supabase Dashboard.</div>
              </div>
              <div className="guideStep">
                <span className="stepNumber">3</span>
                <div>Copy and run the contents of <code>supabase_schema.sql</code> (located in your workspace root). It creates the 4 tables (<code>problems</code>, <code>profiles</code>, <code>projects</code>, <code>teams</code>) with RLS policies and seed data.</div>
              </div>
              <div className="guideStep">
                <span className="stepNumber">4</span>
                <div>Paste your Project URL & Anon Key on the left, and click <strong>Save & Test</strong>!</div>
              </div>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
