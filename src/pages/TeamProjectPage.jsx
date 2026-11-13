// TEAM + PROJECT PAGES: build a team from matched people, then see the full project plan.
import React, { useState } from 'react';
import { ArrowRight, Check, Users, Layers, Zap, CircleCheck, Bot, Send } from 'lucide-react';
import { askProjectAssistant, normSkill, scorePeople } from '../ai.js';
import { Metric, Card, Person } from '../components.jsx';

export function Team({ people, team, add, onBack, onProject, aiResult, onContact }) {
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

export function Project({ team, project, onBack, aiResult }) {
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

export function Task({ done, text }) {
  return (
    <div className="task">
      <span className={done ? 'checkbox done' : 'checkbox'}>{done && <Check size={12} />}</span>
      <span>{text}</span>
    </div>
  );
}

