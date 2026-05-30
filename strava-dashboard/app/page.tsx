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
    <main className="relative flex flex-col items-center justify-center min-h-screen px-4 overflow-hidden">
      {/* Faded route map — a teaser of the run-map view that lives inside */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          maskImage:
            "radial-gradient(ellipse 80% 70% at 50% 50%, transparent 18%, rgba(0,0,0,0.45) 55%, black 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 80% 70% at 50% 50%, transparent 18%, rgba(0,0,0,0.45) 55%, black 100%)",
        }}
      >
        <svg
          className="h-full w-full"
          viewBox="0 0 1200 800"
          preserveAspectRatio="xMidYMid slice"
        >
          {/* subtle map grid */}
          <defs>
            <pattern id="grid" width="64" height="64" patternUnits="userSpaceOnUse">
              <path
                d="M 64 0 L 0 0 0 64"
                fill="none"
                stroke="#E5DFD5"
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <rect width="1200" height="800" fill="url(#grid)" opacity="0.5" />

          {/* the GPS route, drawn like run-map */}
          <motion.path
            d="M 120 700 C 220 560 140 470 300 430 C 470 388 410 250 560 220 C 710 190 770 330 900 300 C 1030 270 1090 400 1000 490 C 910 580 1050 650 950 720"
            fill="none"
            stroke="#fc4c02"
            strokeWidth={4}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.55 }}
            transition={{ duration: 2.6, ease: "easeInOut", delay: 0.3 }}
          />

          {/* start marker (white dot) */}
          <motion.circle
            cx={120}
            cy={700}
            r={9}
            fill="#ffffff"
            stroke="#fc4c02"
            strokeWidth={4}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 0.6, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.5 }}
          />

          {/* end marker (orange dot) */}
          <motion.circle
            cx={950}
            cy={720}
            r={9}
            fill="#fc4c02"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 0.6, scale: 1 }}
            transition={{ duration: 0.4, delay: 2.9 }}
          />
        </svg>
      </div>

      <motion.div
        initial={{ opacity: 0, filter: "blur(8px)" }}
        animate={{ opacity: 1, filter: "blur(0px)" }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 flex flex-col items-center text-center max-w-md w-full"
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
