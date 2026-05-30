"use client";

import { useEffect, useState } from "react";
import * as motion from "motion/react-client";

export default function Home() {
  const [checking, setChecking] = useState(true);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => {
        if (res.ok) {
          setRedirecting(true);
          window.location.href = "/dashboard";
        } else {
          setChecking(false);
        }
      })
      .catch(() => {
        setChecking(false);
      });
  }, []);

  if (checking || redirecting) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-[3px] border-stone-200 border-t-[#fc4c02] rounded-full animate-spin" />
          <p className="text-stone-500 text-sm">
            {redirecting ? "Redirecting to dashboard..." : "Checking session..."}
          </p>
        </div>
      </main>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, filter: "blur(8px)" }}
      animate={{ opacity: 1, filter: "blur(0px)" }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <main className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-4xl font-light text-stone-800 tracking-tight mb-8">Strava Dashboard</h1>
        <a
          href="/api/auth/login"
          className="bg-[#fc4c02] hover:bg-[#e04400] text-white rounded-lg px-8 py-3.5 text-lg font-semibold no-underline transition-colors"
        >
          Connect with Strava
        </a>
        <p className="mt-6 text-sm text-stone-400">Powered by Strava</p>
      </main>
    </motion.div>
  );
}
