// Small coloured label used for status / severity / type
export default function Badge({ kind, value }) {
  if (!value) return null;
  return <span className={`badge ${kind}-${value}`}>{value}</span>;
}
