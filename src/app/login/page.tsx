import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  SESSION_COOKIE_MAX_AGE,
  SESSION_COOKIE_NAME,
  createSessionToken,
  verifyCredentials,
} from "@/lib/auth";

export const metadata = {
  title: "Log in — Incident War Room",
};

async function login(formData: FormData) {
  "use server";

  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const from = String(formData.get("from") ?? "") || "/incidents";

  const result = verifyCredentials(email, password);

  if (!result) {
    const params = new URLSearchParams({ error: "1" });
    if (from) params.set("from", from);
    redirect(`/login?${params.toString()}`);
  }

  const token = createSessionToken(result.responderId);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_COOKIE_MAX_AGE,
  });

  redirect(from);
}

export default async function LoginPage({
  searchParams,
}: PageProps<"/login">) {
  const params = await searchParams;
  const hasError = params?.error === "1";
  const from =
    typeof params?.from === "string" && params.from.startsWith("/")
      ? params.from
      : "/incidents";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <div className="w-full max-w-sm rounded-lg border border-black/10 p-8 shadow-sm dark:border-white/10">
        <h1 className="text-xl font-semibold">Incident War Room</h1>
        <p className="mt-1 text-sm text-foreground/60">
          Log in with a seeded responder account.
        </p>

        <form action={login} className="mt-6 flex flex-col gap-4">
          <input type="hidden" name="from" value={from} />

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Email</span>
            <input
              type="email"
              name="email"
              required
              autoComplete="username"
              placeholder="alice@example.com"
              className="rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/40 dark:border-white/20 dark:focus:border-white/50"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Password</span>
            <input
              type="password"
              name="password"
              required
              autoComplete="current-password"
              placeholder="demo1234"
              className="rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/40 dark:border-white/20 dark:focus:border-white/50"
            />
          </label>

          {hasError && (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              Invalid email or password. Try one of the testing credentials
              in docs/testing-credentials.md.
            </p>
          )}

          <button
            type="submit"
            className="mt-2 rounded-md bg-foreground px-3 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            Log in
          </button>
        </form>
      </div>
    </div>
  );
}
