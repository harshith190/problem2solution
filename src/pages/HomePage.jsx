// HOME PAGE: landing screen + "Submit a problem" screen.
import React from 'react';
import { Sparkles, ArrowRight, Users, Brain, Layers, Target } from 'lucide-react';
import { Metric } from '../components.jsx';

export function Home({ onAnalyze, onDemo, demoProblem: liveDemo }) {
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

export function Flow({ icon, title }) {
  return <div className="flowItem"><span>{React.cloneElement(icon, { size: 17 })}</span><b>{title}</b></div>;
}


export function Submit({ problem, setProblem, analyze }) {
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

