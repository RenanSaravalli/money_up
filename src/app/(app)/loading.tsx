export default function Loading() {
  return (
    <div className="loading-state" role="status">
      <div className="skeleton skeleton-title" />
      <div className="skeleton skeleton-balance" />
      {[1, 2, 3].map((n) => (
        <div key={n} className="skeleton skeleton-card" />
      ))}
      <span className="sr-only">Carregando suas finanças…</span>
    </div>
  );
}
