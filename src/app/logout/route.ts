import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE_NAME } from "@/lib/auth";

async function clearSessionAndRedirect() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  redirect("/login");
}

export async function GET() {
  await clearSessionAndRedirect();
}

export async function POST() {
  await clearSessionAndRedirect();
}
