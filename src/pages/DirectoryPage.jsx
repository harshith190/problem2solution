// DIRECTORY PAGE: browse all Problems, People and Projects (with search).
import React, { useState } from 'react';
import { Search, Sparkles, ArrowRight, Users, Clock, IndianRupee, Plus, ChevronRight, MessageCircle } from 'lucide-react';
import { normSkill, searchPeople } from '../ai.js';
import { ProfileModal } from '../components.jsx';

export function Directory({ page, problems, people, projects, onAnalyze, onViewProject, onJoinTalent, onContact }) {
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

