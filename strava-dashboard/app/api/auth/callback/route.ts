import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens, upsertUser } from "@/lib/strava";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL("/?error=access_denied", request.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/?error=no_code", request.url)
    );
  }

  try {
    const tokenData = await exchangeCodeForTokens(code);

    upsertUser(
      String(tokenData.athlete.id),
      tokenData.access_token,
      tokenData.refresh_token,
      tokenData.expires_at
    );

    const redirectUrl = new URL("/dashboard", request.url);
    redirectUrl.searchParams.set("athlete", String(tokenData.athlete.id));
    return NextResponse.redirect(redirectUrl);
  } catch {
    return NextResponse.redirect(
      new URL("/?error=token_exchange_failed", request.url)
    );
  }
}
