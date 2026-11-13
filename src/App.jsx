// App: the top navbar + decides which page to show + keeps track of who is logged in.
import React, { useState, useEffect } from 'react';
import { Search, Sparkles, Layers, Menu, LogIn, LogOut } from 'lucide-react';
import { getCredentials, testConnection, apiSignOut, apiGetCurrentUser, apiGetProblems, apiAddProblem, apiGetProfiles, apiGetProjects, apiGetTeams, apiSaveTeamMember, apiGetAccount } from './database.js';
import { getQuickAnalysis, analyzeProblemWithAI } from './ai.js';
import { Home, Submit } from './pages/HomePage.jsx';
import { Analysis } from './pages/AnalysisPage.jsx';
import { Team, Project } from './pages/TeamProjectPage.jsx';
import { Directory } from './pages/DirectoryPage.jsx';
import { LoginPortal } from './pages/LoginPage.jsx';
import { Dashboard } from './pages/AdminPage.jsx';
import { TalentDashboard } from './pages/TalentPage.jsx';
import { UserDashboard } from './pages/UserPage.jsx';
import { NoAccess, ContactModal } from './components.jsx';

export const HOME_FOR_ROLE = { admin: 'admin', talent: 'talent', user: 'account' };

const demoProblem = 'Farmers in rural areas waste water because they do not know when their crops actually need irrigation.';

export default function App() {
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
