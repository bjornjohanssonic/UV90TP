"use client";

import { useEffect } from "react";

// Renamed to /daily-go-plan — keep this path as a redirect for old bookmarks / PWA shortcuts.
export default function MorningRedirect() {
  useEffect(() => {
    window.location.replace("/daily-go-plan");
  }, []);
  return null;
}
