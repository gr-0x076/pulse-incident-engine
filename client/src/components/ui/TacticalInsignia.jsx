import React from 'react';

export const AdminInsignia = ({ className = "w-4 h-4 text-accent-primary" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M4 18h16" />
    <path d="M5 18l1-10 5 4 1-5 1 5 5-4 1 10" />
    <circle cx="12" cy="7" r="1" fill="currentColor" />
    <circle cx="6" cy="8" r="0.75" fill="currentColor" />
    <circle cx="18" cy="8" r="0.75" fill="currentColor" />
  </svg>
);

export const CommanderInsignia = ({ className = "w-4 h-4 text-severity-p1" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" />
    <circle cx="12" cy="12" r="3" />
    <line x1="12" y1="2" x2="12" y2="7" />
    <line x1="12" y1="17" x2="12" y2="22" />
    <line x1="2" y1="12" x2="7" y2="12" />
    <line x1="17" y1="12" x2="22" y2="12" />
  </svg>
);

export const ResponderInsignia = ({ className = "w-4 h-4 text-severity-p2" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 2L3 6v6c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V6l-9-4z" />
    <polyline points="9 12 11 14 15 10" />
  </svg>
);

export const ViewerInsignia = ({ className = "w-4 h-4 text-text-tertiary" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="4" />
    <line x1="12" y1="2" x2="12" y2="6" strokeDasharray="1 2" />
    <line x1="12" y1="18" x2="12" y2="22" strokeDasharray="1 2" />
    <line x1="2" y1="12" x2="6" y2="12" strokeDasharray="1 2" />
    <line x1="18" y1="12" x2="22" y2="12" strokeDasharray="1 2" />
  </svg>
);

export const AlertBeaconInsignia = ({ className = "w-4 h-4 text-severity-p1" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

export const getRoleInsignia = (role, className) => {
  switch (role) {
    case 'ADMIN':
      return <AdminInsignia className={className || "w-4 h-4 text-accent-primary"} />;
    case 'INCIDENT_COMMANDER':
      return <CommanderInsignia className={className || "w-4 h-4 text-severity-p1"} />;
    case 'RESPONDER':
      return <ResponderInsignia className={className || "w-4 h-4 text-severity-p2"} />;
    case 'VIEWER':
      return <ViewerInsignia className={className || "w-4 h-4 text-text-tertiary"} />;
    default:
      return <ResponderInsignia className={className || "w-4 h-4 text-text-secondary"} />;
  }
};
