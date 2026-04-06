import { getIronSession } from "iron-session";
import { cookies } from "next/headers";

export interface SessionData {
  athleteId?: string;
}

const _secret = process.env.SESSION_SECRET;
if (!_secret && process.env.NODE_ENV === "production") {
  throw new Error("SESSION_SECRET environment variable is required in production");
}

const sessionOptions = {
  password: _secret ?? "dev-only-secret-not-for-production-min-32-chars!",
  cookieName: "strava-session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax" as const,
  },
};

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

export async function getAuthenticatedAthleteId(): Promise<string | null> {
  const session = await getSession();
  return session.athleteId || null;
}
