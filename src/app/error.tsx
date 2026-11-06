"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="standalone-state">
      <h1>Vamos reconectar seu Fluxo.</h1>
      <p>
        Não foi possível carregar o aplicativo. Verifique a conexão e a
        configuração do Neon.
      </p>
      <Button onClick={reset}>Tentar novamente</Button>
    </div>
  );
}
