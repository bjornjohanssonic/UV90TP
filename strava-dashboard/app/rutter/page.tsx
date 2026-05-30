"use client";

import { useState } from "react";
import RouteEditor from "./route-editor";
import { useAuthGuard } from "@/app/hooks/use-auth-guard";

type RouteMode = "draw" | "suggest";

export default function RoutesPage() {
  useAuthGuard();
  const [mode, setMode] = useState<RouteMode>("draw");

  return (
    <main className="max-w-[1400px] mx-auto p-4 sm:p-8 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 flex-wrap gap-2.5">
        <div>
          <h1 className="text-3xl font-light text-stone-800 tracking-tight">Rutter</h1>
          <p className="text-sm text-stone-500 mt-1">Rita en löprutt och se sträckan live</p>
        </div>
        <div className="flex items-center gap-2.5">
          {/* Mode toggle */}
          <div className="flex bg-stone-100 border border-stone-200 rounded-lg p-0.5">
            <button
              onClick={() => setMode("draw")}
              className={`px-3 py-1.5 text-sm font-medium rounded-md cursor-pointer transition-all border-none ${
                mode === "draw" ? "bg-white text-stone-800 shadow-sm" : "bg-transparent text-stone-500 hover:text-stone-700"
              }`}
            >
              Rita
            </button>
            <button
              onClick={() => setMode("suggest")}
              className={`px-3 py-1.5 text-sm font-medium rounded-md cursor-pointer transition-all border-none ${
                mode === "suggest" ? "bg-white text-stone-800 shadow-sm" : "bg-transparent text-stone-500 hover:text-stone-700"
              }`}
            >
              Föreslå
            </button>
          </div>
          <nav className="flex items-center gap-1.5 flex-wrap">
            {[
              { href: "/dashboard", label: "Dashboard" },
              { href: "/daily-go-plan", label: "Daily Go Plan" },
              { href: "/training-plan", label: "Plan" },
              { href: "/shoes", label: "Skor" },
            ].map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="border border-stone-300 hover:border-stone-400 text-stone-500 hover:text-stone-800 rounded-lg px-3 py-2 text-sm font-medium no-underline transition-all"
              >
                {l.label}
              </a>
            ))}
          </nav>
        </div>
      </div>

      {mode === "draw" ? (
        <RouteEditor />
      ) : (
        <div className="bg-white border border-stone-200 rounded-xl p-10 text-center">
          <h2 className="text-lg font-medium text-stone-700 mb-2">Föreslå rutt — kommer snart</h2>
          <p className="text-sm text-stone-500 max-w-md mx-auto">
            Förslagsläget bygger rutter utifrån din nuvarande position och hur du brukar springa.
            Tills vidare kan du rita rutter själv under <span className="font-medium text-stone-700">Rita</span>.
          </p>
        </div>
      )}
    </main>
  );
}
