"use client";

import { useEffect } from "react";

/**
 * Redirect to the landing page (Strava login) when there's no valid session.
 *
 * Every data API is scoped to the authenticated athlete and returns 401 when
 * the session cookie is missing or expired. Without this guard a page just
 * spins on empty data instead of prompting the user to reconnect. Call once
 * near the top of any client page that needs authenticated data.
 */
export function useAuthGuard() {
  useEffect(() => {
    fetch("/api/auth/session").then((res) => {
      if (!res.ok) window.location.href = "/";
    });
  }, []);
}
