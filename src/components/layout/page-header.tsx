"use client";
import Link from "next/link";
import { ArrowLeft, MoreHorizontal, Plus } from "lucide-react";
export function PageHeader({
  title,
  eyebrow,
  action,
  onAction,
  options,
}: {
  title: string;
  eyebrow?: string;
  action?: string;
  onAction?: () => void;
  options?: () => void;
}) {
  return (
    <header className="page-header">
      <Link
        href="/dashboard"
        className="circle-button mobile-back"
        aria-label="Voltar ao início"
      >
        <ArrowLeft size={19} />
      </Link>
      <div>
        <span className="eyebrow">{eyebrow ?? "SEU FLUXO"}</span>
        <h1>{title}</h1>
      </div>
      {action ? (
        <button
          className="header-action"
          onClick={onAction}
          aria-label={action}
        >
          <Plus size={17} />
          <span>{action}</span>
        </button>
      ) : (
        <button
          className="circle-button"
          onClick={options}
          aria-label="Opções da página"
        >
          <MoreHorizontal size={20} />
        </button>
      )}
    </header>
  );
}
