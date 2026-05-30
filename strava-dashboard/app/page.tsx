"use client";

import { useEffect, useState } from "react";
import * as motion from "motion/react-client";
import { Activity, TrendingUp, MessageSquare } from "lucide-react";

const features = [
  {
    icon: Activity,
    title: "Readiness",
    description: "Daglig poäng 0–100",
  },
  {
    icon: TrendingUp,
    title: "Belastning",
    description: "ACWR-spårning",
  },
  {
    icon: MessageSquare,
    title: "Coaching",
    description: "AI-coach-direktiv",
  },
];

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
    <main className="flex flex-col items-center justify-center min-h-screen px-4">
      <motion.div
        initial={{ opacity: 0, filter: "blur(8px)" }}
        animate={{ opacity: 1, filter: "blur(0px)" }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="flex flex-col items-center text-center max-w-md w-full"
      >
        <span className="text-xs uppercase tracking-widest text-stone-400 bg-white border border-stone-200 rounded-full px-3 py-1 mb-8">
          Strava-driven
        </span>

        <h1 className="text-5xl font-light text-stone-800 tracking-tight mb-3">
          Ground Control
        </h1>
        <p className="text-lg text-stone-400 font-light mb-10">
          Din personliga löparcoach
        </p>

        <div className="grid grid-cols-3 gap-3 w-full mb-10">
          {features.map(({ icon: Icon, title, description }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: "easeOut", delay: 0.2 + i * 0.1 }}
              className="bg-white border border-stone-200 rounded-xl p-4 flex flex-col items-center gap-2"
            >
              <Icon size={18} className="text-stone-400" />
              <span className="text-xs font-medium text-stone-700">{title}</span>
              <span className="text-[0.65rem] text-stone-400 leading-tight">{description}</span>
            </motion.div>
          ))}
        </div>

        <a
          href="/api/auth/login"
          className="bg-[#fc4c02] hover:bg-[#e04400] text-white rounded-lg px-8 py-3.5 text-base font-semibold no-underline transition-colors w-full text-center"
        >
          Connect with Strava
        </a>

        <p className="mt-6 text-xs text-stone-300">
          Powered by Strava
        </p>
      </motion.div>
    </main>
  );
}
