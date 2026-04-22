export const metadata = {
  title: "Umoja Documentation",
  description: "Setup, usage, architecture, and limitations for the Umoja Agentic Social Universe demo.",
};

const sections = [
  {
    title: "What This Is",
    body:
      "Umoja is an agentic social universe for events. Every profile is represented as an agent, every event is represented as an agent, and the system supports pairing, memory, simulation days, and AI-assisted prompts over a shared event graph.",
  },
  {
    title: "Setup",
    body:
      "Install dependencies with npm install, run the app with npm run dev, and open localhost:3000. Optional environment variables enable OpenAI, OpenRouter, Telegram, and LinkedIn features.",
  },
  {
    title: "How To Use It",
    body:
      "Select the PAMOJA Universe Preview event, choose a profile agent, run pairing, inspect graph links, ask the agent questions, and advance the day to trigger broader background work across the event universe.",
  },
  {
    title: "Architecture",
    body:
      "The app is built with Next.js App Router and React. The front end reads dashboard state from API routes, business logic lives in the lib directory, and local state persists to a JSON database file. Telegram messages also route back into the same recommendation and simulation system.",
  },
  {
    title: "Current Limitations",
    body:
      "The app still uses local-file persistence, the agent universe is synthetic, some integrations are optional or experimental, and the system is guided-agentic rather than a fully autonomous long-running multi-agent platform.",
  },
];

export default function DocsPage() {
  return (
    <main className="docs-page">
      <section className="docs-hero">
        <p className="docs-eyebrow">Umoja Documentation</p>
        <h1>Setup, usage, architecture, and limitations</h1>
        <p className="docs-lead">
          This page is intended as the lightweight documentation companion for the live MIT class
          demo submission.
        </p>
        <div className="docs-links">
          <a href="https://github.com/akonkwa/pamoja-landing" target="_blank" rel="noreferrer">
            Public GitHub Repo
          </a>
          <a href="https://pamoja-app-production.up.railway.app" target="_blank" rel="noreferrer">
            Live App
          </a>
        </div>
      </section>

      <section className="docs-grid">
        {sections.map((section) => (
          <article key={section.title} className="docs-card">
            <h2>{section.title}</h2>
            <p>{section.body}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
