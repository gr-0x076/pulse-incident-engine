import { Routes, Route } from 'react-router-dom';

function App() {
  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-text-primary tracking-tight">
          Pulse
        </h1>
        <p className="text-sm text-text-secondary mt-2">
          Incident Triage & Response Engine
        </p>
        <div className="mt-6 flex items-center gap-2 justify-center">
          <span className="severity-dot severity-dot-p1 animate-pulse-live" />
          <span className="text-xs font-mono text-text-tertiary">SYSTEM ONLINE</span>
        </div>
      </div>
    </div>
  );
}

export default App;
