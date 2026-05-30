"use client";

import { useEffect, useState } from "react";
import * as motion from "motion/react-client";
import { Activity, TrendingUp, MessageSquare } from "lucide-react";
import DashboardPreview from "./dashboard-preview";

const features = [
  { icon: Activity,       title: "Readiness",  description: "Score 0–100"    },
  { icon: TrendingUp,     title: "Belastning", description: "ACWR"            },
  { icon: MessageSquare,  title: "Coaching",   description: "AI-direktiv"     },
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
      .catch(() => setChecking(false));
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
    <main className="relative min-h-screen overflow-hidden bg-[#F7F3EE]">
      {/* Blurred dashboard preview — full screen backdrop */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        className="pointer-events-none absolute inset-0 z-0 blur-[2px] scale-[1.02]"
      >
        <DashboardPreview />
      </motion.div>

      {/*
        Mobile: gradient is almost transparent at top (preview shows through)
                then fades to solid cream at ~55% so login area is legible.
        Desktop: lighter uniform cream wash — the floating card provides contrast.
      */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[1] sm:hidden"
        style={{
          background:
            "linear-gradient(to bottom, rgba(247,243,238,0.08) 0%, rgba(247,243,238,0.08) 28%, rgba(247,243,238,0.88) 52%, #F7F3EE 64%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[1] hidden sm:block"
        style={{ background: "rgba(247,243,238,0.55)" }}
      />

      {/* ── Mobile layout ─────────────────────────────────────────────────── */}
      {/* Spacer: pushes login content below the visible preview zone */}
      <div className="h-[40vh] sm:hidden" />

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut", delay: 0.25 }}
        className="relative z-[2] flex flex-col items-center text-center px-6 pb-12 sm:hidden"
      >
        <LoginContent features={features} />
      </motion.div>

      {/* ── Desktop layout — floating card ────────────────────────────────── */}
      <div className="hidden sm:flex absolute inset-0 z-[2] items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 14, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.3 }}
          className="w-full max-w-md bg-white/82 backdrop-blur-md border border-stone-200 rounded-2xl shadow-xl shadow-stone-300/30 px-8 py-10 flex flex-col items-center text-center"
        >
          <LoginContent features={features} />
        </motion.div>
      </div>
    </main>
  );
}

type Feature = { icon: React.ElementType; title: string; description: string };

function LoginContent({ features }: { features: Feature[] }) {
  return (
    <>
      <span className="text-xs uppercase tracking-widest text-stone-400 bg-white border border-stone-200 rounded-full px-3 py-1 mb-7">
        Strava-driven
      </span>

      <h1 className="text-4xl sm:text-5xl font-light text-stone-800 tracking-tight mb-3">
        Ground Control
      </h1>
      <p className="text-base sm:text-lg text-stone-400 font-light mb-8">
        Din personliga löparcoach
      </p>

      <div className="grid grid-cols-3 gap-2.5 w-full mb-8">
        {features.map(({ icon: Icon, title, description }, i) => (
          <motion.div
            key={title}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut", delay: 0.35 + i * 0.08 }}
            className="bg-white border border-stone-200 rounded-xl p-3 sm:p-4 flex flex-col items-center gap-1.5"
          >
            <Icon size={16} className="text-stone-400" />
            <span className="text-xs font-medium text-stone-700">{title}</span>
            <span className="text-[0.6rem] text-stone-400 leading-tight">{description}</span>
          </motion.div>
        ))}
      </div>

      <a
        href="/api/auth/login"
        className="bg-[#fc4c02] hover:bg-[#e04400] text-white rounded-lg px-6 py-3.5 text-base font-semibold no-underline transition-colors w-full text-center"
      >
        Connect with Strava
      </a>

      <p className="mt-5 text-xs text-stone-300">Powered by Strava</p>
    </>
  );
}
