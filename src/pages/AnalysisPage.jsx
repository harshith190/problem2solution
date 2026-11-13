// ANALYSIS PAGE: shows the AI result — solution, cost, skills needed and matched people.
import React from 'react';
import { Sparkles, ArrowRight, Check, AlertTriangle, Users, Layers, Target, IndianRupee } from 'lucide-react';
import { scorePeople } from '../ai.js';
import { Metric, Card, Person } from '../components.jsx';

export function Analysis({ problem, people, add, team, onTeam, onProject, aiResult, analyzing, onContact }) {
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


export function Similar({ title, sim }) {
  return (
    <div className="similar">
      <div><b>{title}</b></div>
      <strong>{sim}</strong>
    </div>
  );
}

