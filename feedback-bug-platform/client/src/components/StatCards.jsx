export default function StatCards({ stats }) {
  if (!stats) return null;
  const s = stats.byStatus || {};
  const cards = [
    { label: 'Total issues', value: stats.total },
    { label: 'Open', value: s.open || 0 },
    { label: 'In progress', value: s['in-progress'] || 0 },
    { label: 'Resolved', value: (s.resolved || 0) + (s.closed || 0) },
    { label: 'Critical', value: stats.bySeverity?.critical || 0 },
    { label: 'AI-flagged duplicates', value: stats.duplicates },
  ];
  return (
    <div className="stats">
      {cards.map((c) => (
        <div key={c.label} className="stat">
          <div className="stat-value">{c.value}</div>
          <div className="stat-label">{c.label}</div>
        </div>
      ))}
    </div>
  );
}
