import { headers } from "next/headers";
import { getAuth } from "./auth";
import { environmentStatus } from "./env";
export async function getSession() {
  if (!environmentStatus().ready) return null;
  return getAuth().api.getSession({ headers: await headers() });
}
