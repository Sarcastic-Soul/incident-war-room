import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/**
 * Intentionally simple test-credential auth for a hackathon submission.
 *
 * This is NOT a real user-management system: no OAuth, no Sanity login, no
 * password hashing. It is a short, hardcoded list of seeded fake responders
 * (see scripts/seed.ts) that judges can log in as using the credentials in
 * docs/testing-credentials.md. Do not reuse this pattern for anything with
 * real stakes.
 */

export const SESSION_COOKIE_NAME = "iwr_session";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

type TestCredential = {
  password: string;
  responderId: string;
};

/**
 * Keyed by the "email" a judge types into the login form. Passwords are
 * plain demo strings on purpose — this app has no real user data behind it.
 */
const TEST_CREDENTIALS: Record<string, TestCredential> = {
  "alice@example.com": {
    password: "demo1234",
    responderId: "responder-alice",
  },
  "bob@example.com": {
    password: "demo1234",
    responderId: "responder-bob",
  },
  "carol@example.com": {
    password: "demo1234",
    responderId: "responder-carol",
  },
};

function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error(
      "Missing environment variable: AUTH_SECRET (see .env.local.example)",
    );
  }
  return secret;
}

/** Constant-time-ish string comparison so failed logins don't leak timing info. */
function safeCompare(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);

  // timingSafeEqual throws if buffers differ in length, so pad to a fixed
  // length first — the comparison result still depends only on content.
  const maxLength = Math.max(aBuf.length, bBuf.length, 32);
  const aPadded = Buffer.alloc(maxLength);
  const bPadded = Buffer.alloc(maxLength);
  aBuf.copy(aPadded);
  bBuf.copy(bPadded);

  const lengthsMatch = aBuf.length === bBuf.length;
  const contentsMatch = timingSafeEqual(aPadded, bPadded);
  return lengthsMatch && contentsMatch;
}

/**
 * Checks an email/password pair against the seeded test-credential list.
 * Never logs the password, only whether a match was found.
 */
export function verifyCredentials(
  email: string,
  password: string,
): { responderId: string } | null {
  const normalizedEmail = email.trim().toLowerCase();
  const credential = TEST_CREDENTIALS[normalizedEmail];

  // Always run a comparison, even on an unknown email, so response timing
  // doesn't reveal whether the email exists.
  const candidatePassword = credential?.password ?? "";
  const isMatch = safeCompare(candidatePassword, password);

  if (!credential || !isMatch) {
    return null;
  }

  return { responderId: credential.responderId };
}

type SessionPayload = {
  responderId: string;
  exp: number; // unix seconds
};

function base64UrlEncode(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(input: string): Buffer {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(padded, "base64");
}

function sign(payload: string): string {
  return base64UrlEncode(
    createHmac("sha256", getAuthSecret()).update(payload).digest(),
  );
}

/** Creates a signed, expiring session token for the given responder. */
export function createSessionToken(responderId: string): string {
  const payload: SessionPayload = {
    responderId,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

/**
 * Verifies a session token's signature and expiry, returning the responder
 * identity it carries, or null if the token is missing, tampered with, or
 * expired.
 */
export function verifySessionToken(
  token: string | undefined | null,
): { responderId: string } | null {
  if (!token) return null;

  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return null;

  const expectedSignature = sign(encodedPayload);
  if (!safeCompare(signature, expectedSignature)) {
    return null;
  }

  try {
    const payload = JSON.parse(
      base64UrlDecode(encodedPayload).toString("utf8"),
    ) as SessionPayload;

    if (
      typeof payload.responderId !== "string" ||
      typeof payload.exp !== "number"
    ) {
      return null;
    }

    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return { responderId: payload.responderId };
  } catch {
    return null;
  }
}

export const SESSION_COOKIE_MAX_AGE = SESSION_MAX_AGE_SECONDS;

/**
 * Reads the current responder's id from the session cookie, for use in
 * server components and server actions (e.g. "who authored this timeline
 * event"). Returns null if there is no valid session.
 */
export async function getCurrentResponderId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = verifySessionToken(token);
  return session?.responderId ?? null;
}
