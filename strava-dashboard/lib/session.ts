import { getIronSession } from "iron-session";
import { cookies } from "next/headers";

export interface SessionData {
  athleteId?: string;
}

const sessionOptions = {
  password: process.env.SESSION_SECRET || "fallback-secret-must-be-at-least-32-chars-long!!",
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
