// ADMIN PAGE (admin only): tabs to manage projects, people, problems, messages, users, Gemini key and database.
import React, { useState, useEffect } from 'react';
import { Sparkles, Users, Layers, Target, Plus, MessageCircle, Shield, Trash2, Database, Upload, RefreshCw, CheckCircle2, AlertCircle, ExternalLink, LogOut, Bot } from 'lucide-react';
import { getCredentials, saveCredentials, testConnection, apiAddProblem, apiDeleteProblem, apiAddProfile, apiDeleteProfile, apiAddProject, apiDeleteProject, apiListUsers, apiSetUserRole } from '../database.js';
import { getGeminiKey, saveGeminiKey, testGeminiApiKey } from '../ai.js';
import { MessagesCard } from '../components.jsx';

// =========================================================
// DASHBOARD (Upload Projects, Team Members, Supabase & Gemini AI)
// =========================================================
export function Dashboard({ problems, setProblems, people, setPeople, projects, setProjects, dbStatus, setDbStatus, refreshAll, currentUser, onLogout }) {
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

