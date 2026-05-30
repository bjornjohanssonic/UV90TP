"use client";

import { useEffect, useState } from "react";
import * as motion from "motion/react-client";
import { Activity, TrendingUp, MessageSquare } from "lucide-react";
import DashboardPreview from "./dashboard-preview";

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
    <main className="relative flex flex-col items-center justify-center min-h-screen px-4 overflow-hidden">
      {/* Preview of the real dashboard, blurred + dimmed behind the login card */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0, scale: 1.04 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        className="pointer-events-none absolute inset-0 z-0 blur-[3px]"
      >
        <DashboardPreview />
      </motion.div>

      {/* Cream wash so the preview reads as a backdrop and the card stays legible */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 50% 50%, rgba(247,243,238,0.92) 0%, rgba(247,243,238,0.78) 45%, rgba(247,243,238,0.62) 100%)",
        }}
      />

      {/* Login card — floats above the app preview */}
      <motion.div
        initial={{ opacity: 0, y: 12, filter: "blur(8px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.3 }}
        className="relative z-10 flex flex-col items-center text-center max-w-md w-full bg-white/85 backdrop-blur-md border border-stone-200 rounded-2xl shadow-xl shadow-stone-300/30 px-8 py-10"
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
              transition={{ duration: 0.4, ease: "easeOut", delay: 0.5 + i * 0.1 }}
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
