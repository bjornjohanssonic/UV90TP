import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/lib/strava";
import { upsertUser } from "@/lib/repositories";
import { getSession } from "@/lib/session";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL("/?error=access_denied", request.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL("/?error=no_code", request.url));
  }

  try {
    const tokenData = await exchangeCodeForTokens(code);
    const athleteId = String(tokenData.athlete.id);

    await upsertUser(athleteId, tokenData.access_token, tokenData.refresh_token, tokenData.expires_at);

    const session = await getSession();
    session.athleteId = athleteId;
    await session.save();

    return NextResponse.redirect(new URL("/dashboard", request.url));
  } catch {
    return NextResponse.redirect(new URL("/?error=token_exchange_failed", request.url));
  }
}
