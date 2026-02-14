import axios from "axios";
import { getUserByAthleteId, updateUserTokens } from "./repositories";

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  athlete: { id: number };
}

export async function exchangeCodeForTokens(code: string): Promise<TokenResponse> {
  const response = await axios.post<TokenResponse>("https://www.strava.com/oauth/token", {
    client_id: process.env.STRAVA_CLIENT_ID,
    client_secret: process.env.STRAVA_CLIENT_SECRET,
    code,
    grant_type: "authorization_code",
  });
  return response.data;
}

export async function refreshAccessToken(athleteId: string): Promise<string> {
  const user = getUserByAthleteId(athleteId);

  if (!user) {
    throw new Error("User not found");
  }

  const now = Math.floor(Date.now() / 1000);
  if (user.token_expires_at > now) {
    return user.access_token;
  }

  const response = await axios.post<TokenResponse>("https://www.strava.com/oauth/token", {
    client_id: process.env.STRAVA_CLIENT_ID,
    client_secret: process.env.STRAVA_CLIENT_SECRET,
    grant_type: "refresh_token",
    refresh_token: user.refresh_token,
  });

  const { access_token, refresh_token, expires_at } = response.data;

  updateUserTokens(athleteId, access_token, refresh_token, expires_at);

  return access_token;
}
