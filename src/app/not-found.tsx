import Link from "next/link";
export default function NotFound() {
  return (
    <div className="standalone-state">
      <span className="eyebrow">404</span>
      <h1>Esse caminho saiu do fluxo.</h1>
      <p>Volte ao início para continuar.</p>
      <Link className="button button-primary" href="/dashboard">
        Ir para o início
      </Link>
    </div>
  );
}
