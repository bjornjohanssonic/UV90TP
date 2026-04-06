import type { CoachContext, DailyBriefing } from "@/types/coach";

export function generateDailyBriefing(ctx: CoachContext): DailyBriefing {
  const remaining = ctx.targetVolumeKm - ctx.actualVolumeKm;
  const daysLeft = 7 - ctx.dayOfWeek;
  const longRunNeeded = ctx.longRunKm > 0 && ctx.longestRunThisWeekKm < ctx.longRunKm * 0.9;
  const isSaturday = ctx.dayOfWeek === 6;
  const isSunday = ctx.dayOfWeek === 7;

  // Priority 1: Safety overrides
  if (ctx.consecutiveRunDays >= 5) {
    return {
      headline: "Rest. Your body needs recovery after 5 straight days.",
      subtext: `${ctx.consecutiveRunDays} consecutive run days. Readiness: ${ctx.readinessScore}.`,
      urgency: "rest",
    };
  }

  if (ctx.acwrZone === "red" && ctx.acwrRatio > 1.5) {
    return {
      headline: `Back off. Load ratio is ${ctx.acwrRatio} \u2014 danger zone.`,
      subtext: `ACWR ${ctx.acwrRatio}. Reduce volume this week to prevent injury.`,
      urgency: "rest",
    };
  }

  if (ctx.readinessScore < 25) {
    return {
      headline: "Do not run today. Recovery is critical.",
      subtext: `Readiness ${ctx.readinessScore} (Depleted). Rest or very light walking only.`,
      urgency: "rest",
    };
  }

  // Priority 2: Race proximity
  if (ctx.daysToRace !== null && ctx.daysToRace >= 0 && ctx.daysToRace <= 3) {
    return {
      headline: ctx.daysToRace === 0 ? "Race day. Trust your training." : "Race prep. Rest or 10-minute shakeout.",
      subtext: `${ctx.daysToRace} day${ctx.daysToRace !== 1 ? "s" : ""} to race.`,
      urgency: "race",
    };
  }

  if (ctx.planPhase === "race") {
    return {
      headline: "Race week. Easy shakeout or complete rest.",
      subtext: `Stay loose, stay rested. ${ctx.daysToRace ?? "?"} days to go.`,
      urgency: "race",
    };
  }

  // Priority 3: Plan phase — taper
  if (ctx.planPhase === "taper") {
    if (remaining > 0 && daysLeft > 0) {
      const shortRun = Math.min(remaining, 8);
      return {
        headline: `Short ${shortRun.toFixed(0)}km run at comfortable pace.`,
        subtext: `Taper week. ${remaining.toFixed(1)}km remaining. Keep efforts brief.`,
        urgency: "easy",
      };
    }
    return {
      headline: "Taper volume done. Rest or light cross-training.",
      subtext: "Stay fresh. Your body is absorbing the training.",
      urgency: "rest",
    };
  }

  // Priority 4: Plan phase — recovery
  if (ctx.planPhase === "recovery") {
    if (remaining > 0 && daysLeft > 0) {
      const perDay = remaining / daysLeft;
      return {
        headline: `Easy ${perDay.toFixed(0)}km at recovery pace.`,
        subtext: `Recovery week${ctx.planWeekNumber ? ` (week ${ctx.planWeekNumber})` : ""}. ${remaining.toFixed(1)}km left. Low intensity.`,
        urgency: "easy",
      };
    }
    return {
      headline: "Recovery volume complete. Rest up.",
      subtext: "Good discipline. Next build week starts Monday.",
      urgency: "rest",
    };
  }

  // Priority 5: Long run day
  if (longRunNeeded) {
    if (isSaturday) {
      const headline = ctx.backToBack
        ? `Long run: ${ctx.longRunKm}km today. ${Math.round(ctx.longRunKm * 0.65)}km tomorrow.`
        : `Long run: ${ctx.longRunKm}km. Saturday or Sunday \u2014 your call.`;
      return {
        headline,
        subtext: `${remaining.toFixed(1)}km remaining this week. Get the long run done.`,
        urgency: "key_session",
      };
    }
    if (isSunday) {
      return {
        headline: `Long run TODAY: ${ctx.longRunKm}km. Last day of the week.`,
        subtext: `${remaining.toFixed(1)}km left. Make it count.`,
        urgency: "key_session",
      };
    }
    if (ctx.dayOfWeek >= 4) {
      return {
        headline: `Save ${ctx.longRunKm}km long run for the weekend.`,
        subtext: `${remaining.toFixed(1)}km remaining. Spread shorter runs until then.`,
        urgency: "moderate",
      };
    }
  }

  // Priority 6: Readiness-based guidance
  if (ctx.readinessScore < 40) {
    return {
      headline: "Easy day. Your readiness is low.",
      subtext: `Readiness ${ctx.readinessScore} (Fatigued). Light jog or rest.`,
      urgency: "easy",
    };
  }

  // Priority 7: Build week volume management
  if (remaining > 0 && daysLeft > 0) {
    const perDay = remaining / daysLeft;
    const phase = ctx.planPhase ? `${ctx.planPhase.charAt(0).toUpperCase() + ctx.planPhase.slice(1)} week${ctx.planWeekNumber ? ` ${ctx.planWeekNumber}` : ""}` : "";
    return {
      headline: `Easy ${perDay.toFixed(0)}km today.${phase ? ` ${phase}.` : ""}`,
      subtext: `${remaining.toFixed(1)}km remaining. ACWR ${ctx.acwrRatio}${ctx.acwrZone === "green" ? " (good)" : ""}.`,
      urgency: "moderate",
    };
  }

  // Target already met
  if (remaining <= 0) {
    if (ctx.consecutiveRunDays >= 2) {
      return {
        headline: "Target met. Take a rest day.",
        subtext: `${ctx.targetVolumeKm}km complete. ${ctx.consecutiveRunDays} days in a row.`,
        urgency: "rest",
      };
    }
    return {
      headline: "Weekly target met. Extra km should be easy effort.",
      subtext: `${ctx.targetVolumeKm}km done. Keep any bonus runs relaxed.`,
      urgency: "easy",
    };
  }

  // Fallback — no plan
  return {
    headline: "Get out and run. Any distance counts.",
    subtext: `Readiness: ${ctx.readinessScore}. No plan active \u2014 create one for structured training.`,
    urgency: "moderate",
  };
}
