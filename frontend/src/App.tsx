const agents = [
  { name: "Research", status: "Reading MD&A", tone: "amber" },
  { name: "Risk", status: "Checking exposure bands", tone: "blue" },
  { name: "Executor", status: "Waiting on approval", tone: "green" },
  { name: "Auditor", status: "Validating citations", tone: "red" }
];

const metrics = [
  { label: "Held-out score", value: "0.74", note: "+0.18 vs baseline" },
  { label: "Rubric coverage", value: "92%", note: "calc, attribution, citation" },
  { label: "Episodes", value: "128", note: "last 24h sandbox runs" }
];

const checkpoints = [
  { name: "Baseline frontier", score: "0.41" },
  { name: "Rejection-sampled SFT", score: "0.58" },
  { name: "RL-tuned checkpoint", score: "0.74" }
];

export default function App() {
  return (
    <main className="page">
      <section className="hero">
        <p className="eyebrow">Oracle.ai control room</p>
        <h1>Autonomous quant operations, split into a real frontend and backend.</h1>
        <p className="lede">
          The UI owns visibility and storytelling. The backend owns filings, rubrics,
          orchestration, and training.
        </p>
      </section>

      <section className="grid">
        <article className="panel">
          <div className="panel-header">
            <h2>Agent firm</h2>
            <span className="badge">Live topology</span>
          </div>
          <div className="agent-list">
            {agents.map((agent) => (
              <div className={`agent agent-${agent.tone}`} key={agent.name}>
                <strong>{agent.name}</strong>
                <span>{agent.status}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panel-header">
            <h2>Runtime metrics</h2>
            <span className="badge">API-ready</span>
          </div>
          <div className="metric-list">
            {metrics.map((metric) => (
              <div className="metric" key={metric.label}>
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
                <small>{metric.note}</small>
              </div>
            ))}
          </div>
        </article>

        <article className="panel panel-wide">
          <div className="panel-header">
            <h2>Checkpoint progression</h2>
            <span className="badge">Held-out evaluation</span>
          </div>
          <div className="timeline">
            {checkpoints.map((checkpoint, index) => (
              <div className="timeline-row" key={checkpoint.name}>
                <div className="timeline-step">{index + 1}</div>
                <div>
                  <strong>{checkpoint.name}</strong>
                  <p>Rubric reward: {checkpoint.score}</p>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="panel panel-accent">
          <div className="panel-header">
            <h2>Boundary</h2>
            <span className="badge">Separation of concerns</span>
          </div>
          <p>
            Frontend talks to HTTP endpoints only. Backend remains the single home
            for HUD scenarios, graders, filing parsers, and training workflows.
          </p>
        </article>
      </section>
    </main>
  );
}
