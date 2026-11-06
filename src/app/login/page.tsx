import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { environmentStatus } from "@/lib/env";
import { LoginForm } from "@/features/auth/login-form";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export default async function Login() {
  const configured = environmentStatus().ready;
  if (configured && (await getSession())) redirect("/dashboard");
  return <LoginForm configured={configured} />;
}
