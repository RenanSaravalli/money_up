import Link from "next/link";
import { Flag, ArrowRight, Sparkles } from "lucide-react";
export default function Goals() {
  return (
    <div className="goals-page">
      <div className="goals-orbit">
        <span />
        <span />
        <div>
          <Flag size={42} strokeWidth={1.2} />
        </div>
        <Sparkles className="goal-sparkle" size={19} />
      </div>
      <span className="coming-soon">UM NOVO CAPÍTULO, EM BREVE</span>
      <h1>
        Seus sonhos merecem
        <br />
        <span>um plano.</span>
      </h1>
      <p>
        Um lugar para transformar o que você deseja
        <br />
        em próximos passos. As metas estão a caminho.
      </p>
      <div className="goal-status">
        <span className="subtle-dot" />
        Módulo de metas ainda não disponível
      </div>
      <Link href="/dashboard" className="button button-primary">
        Cuidar do meu presente
        <ArrowRight size={17} />
      </Link>
      <small>
        Por agora, comece com o que faz a diferença:
        <br />
        conhecer e organizar seus movimentos.
      </small>
    </div>
  );
}
