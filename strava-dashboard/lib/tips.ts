import type { Activity } from "@/types";
import type { Tip } from "@/types/coach";
import {
  getTipsByTrigger,
  getTipsByCategory,
  getRecentlyShownTipIds,
  recordTipShown,
  insertTip,
  getTipCount,
  clearAllTips,
} from "@/lib/repositories/tip-repository";
import { toLocalDateStr } from "@/lib/dashboard-helpers";

// ─── Deterministic seed from date string ──────────────────────────────────────

function hashDate(dateStr: string): number {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    const ch = dateStr.charCodeAt(i);
    hash = (hash << 5) - hash + ch;
    hash |= 0;
  }
  return Math.abs(hash);
}

// Simple seeded PRNG (mulberry32)
function seededRandom(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── Seed tips ────────────────────────────────────────────────────────────────

interface SeedTip {
  category: string;
  trigger: string;
  severity: "info" | "warning" | "action";
  title: string;
  body: string;
  source?: string;
  min_weekly_km?: number;
  max_weekly_km?: number;
}

export async function seedTips(): Promise<number> {
  const existing = await getTipCount();
  if (existing > 0) return existing;

  const tips: SeedTip[] = [
    // ═══════════════════════════════════════════════════════════════════════════
    // TIBIALIS ANTERIOR (30+ tips)
    // ═══════════════════════════════════════════════════════════════════════════
    {
      category: "tibialis_anterior",
      trigger: "daily",
      severity: "action",
      title: "Toe raises: 3x15 reps",
      body: "Stand flat, lift toes off the ground keeping heels planted. Hold 2s at the top. Do 3 sets of 15 reps to strengthen the tibialis anterior directly.",
    },
    {
      category: "tibialis_anterior",
      trigger: "daily",
      severity: "action",
      title: "Wall toe raises: 3x12 reps",
      body: "Lean back against a wall with feet 30cm out. Lift toes toward shins, hold 3s. This isolates the tibialis anterior under load.",
    },
    {
      category: "tibialis_anterior",
      trigger: "daily",
      severity: "action",
      title: "Eccentric toe lowers: 3x10",
      body: "Raise toes fully, then lower them as slowly as possible over 4-5 seconds. Eccentric loading builds tendon resilience more effectively than concentric alone.",
    },
    {
      category: "tibialis_anterior",
      trigger: "post_run",
      severity: "action",
      title: "Tib anterior self-massage: 2 min",
      body: "Use your thumb or a massage stick along the outer shin from knee to ankle. Apply moderate pressure for 2 minutes per leg to reduce post-run tightness.",
    },
    {
      category: "tibialis_anterior",
      trigger: "daily",
      severity: "action",
      title: "Resistance band dorsiflexion: 3x15",
      body: "Loop a band around your forefoot anchored behind you. Pull toes toward your shin against resistance. 3 sets of 15 reps per foot builds tibialis anterior endurance.",
    },
    {
      category: "tibialis_anterior",
      trigger: "daily",
      severity: "action",
      title: "Heel walks: 3x20m",
      body: "Walk on your heels with toes lifted off the ground for 20 meters. Repeat 3 times. This is a functional tibialis anterior strengthener used in sports rehab.",
    },
    {
      category: "tibialis_anterior",
      trigger: "post_run",
      severity: "action",
      title: "Kneeling tib stretch: 30s each",
      body: "Kneel with tops of feet flat on the floor. Gently lean back to stretch the tibialis anterior. Hold 30 seconds per side, repeat twice.",
    },
    {
      category: "tibialis_anterior",
      trigger: "recovery_day",
      severity: "action",
      title: "Tib anterior foam roll: 2 min",
      body: "Kneel over a foam roller placed under your shins. Roll slowly from below the knee to the ankle for 2 minutes. Pause on tender spots for 10 seconds.",
    },
    {
      category: "tibialis_anterior",
      trigger: "daily",
      severity: "action",
      title: "Seated toe taps: 3x30s",
      body: "Sit with feet flat on the floor. Tap your toes rapidly for 30 seconds, rest 15 seconds. Repeat 3 times. Builds tibialis anterior endurance for long runs.",
    },
    {
      category: "tibialis_anterior",
      trigger: "daily",
      severity: "info",
      title: "Ankle circles: 20 each direction",
      body: "Rotate your ankle slowly through full range of motion. 20 circles clockwise, 20 counterclockwise per foot. Maintains tibialis anterior flexibility and joint health.",
    },
    {
      category: "tibialis_anterior",
      trigger: "post_long_run",
      severity: "warning",
      title: "Ice shin if sore: 15 min max",
      body: "If your tibialis anterior feels tight or sore after a long run, apply ice wrapped in a cloth for 10-15 minutes. Do not ice directly on skin or exceed 15 minutes.",
    },
    {
      category: "tibialis_anterior",
      trigger: "high_load_week",
      severity: "warning",
      title: "Monitor shin tightness closely",
      body: "High-volume weeks stress the tibialis anterior. If you feel a dull ache along the outer shin during runs, reduce pace immediately and shorten the run by 20%.",
    },
    {
      category: "tibialis_anterior",
      trigger: "daily",
      severity: "action",
      title: "Single-leg toe raise: 3x10 each",
      body: "Balance on one foot and raise your toes 10 times. This corrects side-to-side imbalances in the tibialis anterior that lead to overuse injuries.",
    },
    {
      category: "tibialis_anterior",
      trigger: "post_run",
      severity: "action",
      title: "Dorsiflexion stretch: hold 30s",
      body: "Step one foot back, press the top of your rear foot into the ground and gently push your ankle down. Hold 30 seconds each side to lengthen the tibialis anterior.",
    },
    {
      category: "tibialis_anterior",
      trigger: "daily",
      severity: "action",
      title: "Tib raise off step: 3x12",
      body: "Stand with your heels on a step edge, toes hanging off. Lift toes up toward shins, hold 2s, lower slowly. The increased range of motion strengthens through full dorsiflexion.",
    },
    {
      category: "tibialis_anterior",
      trigger: "rest_day",
      severity: "action",
      title: "Barefoot walking: 10 min",
      body: "Walk barefoot on a flat surface for 10 minutes. Barefoot walking activates intrinsic foot muscles and the tibialis anterior in a natural gait pattern.",
    },
    {
      category: "tibialis_anterior",
      trigger: "post_hard_run",
      severity: "warning",
      title: "Ease off if shins burn post-run",
      body: "A burning sensation in the front of the shin after hard efforts is a tibialis anterior overload signal. Take the next run easy and add 5 extra minutes of stretching.",
    },
    {
      category: "tibialis_anterior",
      trigger: "daily",
      severity: "info",
      title: "Check shoe drop height",
      body: "Shoes with a drop over 10mm shift load away from the tibialis anterior. If rehabbing, a moderate 6-8mm drop balances calf and shin muscle recruitment.",
    },
    {
      category: "tibialis_anterior",
      trigger: "daily",
      severity: "action",
      title: "Alphabet ankles: A-Z each foot",
      body: "Trace the alphabet in the air with your toes, one foot at a time. This moves the tibialis anterior through every angle of motion and takes about 90 seconds per foot.",
    },
    {
      category: "tibialis_anterior",
      trigger: "post_run",
      severity: "action",
      title: "Compression socks for 2h post-run",
      body: "Wear calf compression socks for 2 hours after running. Studies show they reduce shin soreness by improving venous return and reducing tibialis anterior swelling.",
      source: "British Journal of Sports Medicine, 2017",
    },
    {
      category: "tibialis_anterior",
      trigger: "daily",
      severity: "action",
      title: "Isometric tib hold: 3x20s",
      body: "Raise your toes fully and hold at the top for 20 seconds. Repeat 3 times per foot. Isometric holds build tendon stiffness critical for tibialis anterior health.",
    },
    {
      category: "tibialis_anterior",
      trigger: "recovery_day",
      severity: "action",
      title: "Lacrosse ball on outer shin: 90s",
      body: "Sit with one leg crossed. Roll a lacrosse ball along the outer shin muscle belly for 90 seconds. Apply enough pressure to feel release but not sharp pain.",
    },
    {
      category: "tibialis_anterior",
      trigger: "daily",
      severity: "info",
      title: "Warm up shins before running",
      body: "Do 20 toe raises and 10 ankle circles per foot before every run. Cold tibialis anterior muscles are more prone to strain during the first kilometer.",
    },
    {
      category: "tibialis_anterior",
      trigger: "high_load_week",
      severity: "action",
      title: "Add a tib anterior session today",
      body: "During high-volume weeks, do an extra 5-minute tibialis anterior circuit: 15 toe raises, 10 heel walks per side, 10 band dorsiflexions. Prevention beats treatment.",
    },
    {
      category: "tibialis_anterior",
      trigger: "daily",
      severity: "action",
      title: "Banded ankle inversion: 3x12",
      body: "Anchor a band to a fixed point at foot level. Loop it around your forefoot and turn your sole inward against the resistance. 3x12 reps strengthens the tib anterior's inversion role.",
    },
    {
      category: "tibialis_anterior",
      trigger: "post_long_run",
      severity: "action",
      title: "Elevate legs for 15 min post-run",
      body: "Lie on your back with legs up against a wall for 15 minutes after your long run. Reduces shin swelling and accelerates tibialis anterior recovery.",
    },
    {
      category: "tibialis_anterior",
      trigger: "daily",
      severity: "info",
      title: "Avoid sudden mileage spikes",
      body: "The tibialis anterior is one of the first muscles to overload from rapid volume increases. Keep weekly mileage increases under 10% when building back from shin issues.",
    },
    {
      category: "tibialis_anterior",
      trigger: "post_run",
      severity: "action",
      title: "Tibial nerve glide: 10 reps",
      body: "Sit with one leg extended. Point your toes, then flex your foot while extending your neck back. Repeat 10 times per leg. Nerve glides reduce tibialis anterior tension from neural tightness.",
    },
    {
      category: "tibialis_anterior",
      trigger: "daily",
      severity: "action",
      title: "Weighted toe raises: 3x12",
      body: "Hold a dumbbell (3-5kg) at your side and perform toe raises. Adding progressive load strengthens the tibialis anterior beyond bodyweight adaptation.",
      min_weekly_km: 30,
    },
    {
      category: "tibialis_anterior",
      trigger: "rest_day",
      severity: "info",
      title: "Tib recovery: contrast therapy",
      body: "Alternate 1 minute warm water and 30 seconds cold water on your shins for 5 cycles. Contrast therapy promotes blood flow to the tibialis anterior on rest days.",
    },
    {
      category: "tibialis_anterior",
      trigger: "daily",
      severity: "action",
      title: "Slow heel-to-toe walk: 2x20m",
      body: "Walk exaggeratedly slow, rolling from heel to toe over 20 meters. This forces the tibialis anterior to control dorsiflexion through each stride. Repeat twice.",
    },
    {
      category: "tibialis_anterior",
      trigger: "post_hard_run",
      severity: "action",
      title: "Gentle tib stretch: 4x20s",
      body: "After hard runs, gently stretch the tibialis anterior by pointing your toes and pressing the top of your foot down. Hold 20 seconds, repeat 4 times. Never bounce.",
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // RECOVERY (20+ tips)
    // ═══════════════════════════════════════════════════════════════════════════
    {
      category: "recovery",
      trigger: "post_run",
      severity: "action",
      title: "Walk 5 min after every run",
      body: "A 5-minute cool-down walk brings your heart rate down gradually and helps clear lactate from the legs. Never stop abruptly after a run.",
    },
    {
      category: "recovery",
      trigger: "post_long_run",
      severity: "action",
      title: "Refuel within 30 min of long run",
      body: "Eat 1.0-1.2g carbs per kg bodyweight plus 20-25g protein within 30 minutes of finishing. The glycogen replenishment window is most effective in the first hour.",
      source: "ACSM Position Stand on Nutrition and Performance",
    },
    {
      category: "recovery",
      trigger: "recovery_day",
      severity: "info",
      title: "Active recovery: 20 min walk",
      body: "On recovery days, a 20-minute easy walk promotes blood flow without adding training stress. Avoid sitting for more than 90 minutes at a time.",
    },
    {
      category: "recovery",
      trigger: "post_run",
      severity: "action",
      title: "Static stretch: hold 30s each",
      body: "After running, hold each stretch for at least 30 seconds: quads, hamstrings, calves, hip flexors, and glutes. Static stretching post-run reduces next-day soreness.",
    },
    {
      category: "recovery",
      trigger: "recovery_day",
      severity: "action",
      title: "Foam roll major muscle groups",
      body: "Spend 2 minutes per muscle group: quads, IT band, calves, glutes, and hamstrings. Roll slowly and pause on tight spots for 10-15 seconds.",
    },
    {
      category: "recovery",
      trigger: "post_hard_run",
      severity: "action",
      title: "Contrast shower: 3 cycles",
      body: "Alternate 1 minute hot and 30 seconds cold water for 3 cycles, ending on cold. Contrast showers reduce inflammation and perceived muscle soreness after hard efforts.",
    },
    {
      category: "recovery",
      trigger: "post_long_run",
      severity: "warning",
      title: "Next run: easy pace only",
      body: "The run after a long run should always be at easy conversational pace. Your muscles need 48-72 hours to fully recover glycogen stores after runs exceeding 15km.",
    },
    {
      category: "recovery",
      trigger: "high_load_week",
      severity: "warning",
      title: "Schedule at least 2 rest days",
      body: "During high-volume weeks, ensure at least 2 full rest days. Adaptation happens during recovery, not during training. More is not always better.",
    },
    {
      category: "recovery",
      trigger: "daily",
      severity: "info",
      title: "Track morning resting heart rate",
      body: "Measure resting heart rate upon waking before getting out of bed. An increase of 5+ bpm over your baseline indicates incomplete recovery. Take an easy day.",
    },
    {
      category: "recovery",
      trigger: "recovery_day",
      severity: "action",
      title: "Epsom salt bath: 15-20 min",
      body: "Add 300g of Epsom salts to a warm bath and soak for 15-20 minutes. Magnesium absorption through skin helps relax muscles and may reduce soreness.",
    },
    {
      category: "recovery",
      trigger: "post_run",
      severity: "info",
      title: "Hydrate: 500ml within 30 min",
      body: "Drink at least 500ml of water within 30 minutes of finishing your run. Add a pinch of salt if the run was over 60 minutes or in warm conditions.",
    },
    {
      category: "recovery",
      trigger: "daily",
      severity: "info",
      title: "Avoid hard sessions back-to-back",
      body: "Never schedule two hard efforts on consecutive days. Allow at least 48 hours between tempo runs, intervals, or long runs to prevent overtraining.",
    },
    {
      category: "recovery",
      trigger: "recovery_day",
      severity: "action",
      title: "Gentle yoga flow: 20 min",
      body: "A 20-minute gentle yoga session on recovery days improves flexibility, reduces muscle tension, and activates the parasympathetic nervous system for better recovery.",
    },
    {
      category: "recovery",
      trigger: "post_long_run",
      severity: "action",
      title: "Legs up the wall: 10 min",
      body: "Lie on your back with legs elevated against a wall for 10 minutes post-long-run. This reduces lower leg swelling and promotes venous return.",
    },
    {
      category: "recovery",
      trigger: "rest_day",
      severity: "info",
      title: "Rest day is a training day",
      body: "Adaptation happens during rest, not during effort. A true rest day with good nutrition and sleep makes your next hard session stronger. Do not feel guilty.",
    },
    {
      category: "recovery",
      trigger: "high_load_week",
      severity: "action",
      title: "Add 10 min of self-massage",
      body: "During high-volume weeks, spend 10 minutes with a massage gun or foam roller each evening. Focus on calves, quads, and shins to prevent accumulated tightness.",
    },
    {
      category: "recovery",
      trigger: "post_run",
      severity: "action",
      title: "Protein shake within 1 hour",
      body: "Consume 20-30g of protein within 1 hour of running to support muscle repair. Whey protein or a glass of milk with a banana is sufficient.",
    },
    {
      category: "recovery",
      trigger: "daily",
      severity: "info",
      title: "Compression tights: 12-24h post",
      body: "Wearing compression tights for 12-24 hours after hard training reduces muscle oscillation damage and perceived soreness, especially after long runs.",
      source: "Journal of Strength and Conditioning Research, 2016",
    },
    {
      category: "recovery",
      trigger: "recovery_day",
      severity: "action",
      title: "Swimming: 20 min easy laps",
      body: "Easy swimming provides active recovery without impact stress. The water pressure acts as compression and the horizontal position promotes blood flow to legs.",
    },
    {
      category: "recovery",
      trigger: "post_hard_run",
      severity: "action",
      title: "Cold water immersion: 10 min",
      body: "Soak legs in cold water (10-15 degrees C) for 10 minutes after hard efforts. Cold immersion reduces inflammation and accelerates recovery between sessions.",
      source: "Cochrane Review on Cold Water Immersion, 2012",
    },
    {
      category: "recovery",
      trigger: "daily",
      severity: "info",
      title: "Deload week every 4th week",
      body: "Reduce volume by 30-40% every 4th week to allow cumulative fatigue to dissipate. Consistent deload cycles prevent overtraining and maintain long-term progression.",
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // NUTRITION (15+ tips)
    // ═══════════════════════════════════════════════════════════════════════════
    {
      category: "nutrition",
      trigger: "daily",
      severity: "info",
      title: "Eat 1.4-1.7g protein per kg/day",
      body: "Endurance runners need 1.4-1.7g of protein per kilogram of bodyweight daily. Spread intake across 4-5 meals for optimal muscle protein synthesis.",
      source: "ISSN Position Stand on Protein, 2017",
    },
    {
      category: "nutrition",
      trigger: "post_long_run",
      severity: "action",
      title: "Carb reload: 8-10g/kg today",
      body: "After long runs over 90 minutes, aim for 8-10g carbohydrates per kg bodyweight throughout the rest of the day. Rice, pasta, potatoes, and fruit are ideal sources.",
    },
    {
      category: "nutrition",
      trigger: "daily",
      severity: "info",
      title: "Iron-rich foods 3x per week",
      body: "Runners lose iron through sweat and foot-strike hemolysis. Eat red meat, lentils, or spinach paired with vitamin C at least 3 times per week to maintain stores.",
    },
    {
      category: "nutrition",
      trigger: "daily",
      severity: "action",
      title: "Pre-run meal: 2-3h before",
      body: "Eat a carb-rich meal 2-3 hours before running. Good options: oatmeal with banana, toast with honey, or rice with light protein. Avoid high fat and fiber close to running.",
    },
    {
      category: "nutrition",
      trigger: "post_run",
      severity: "action",
      title: "Recovery smoothie: carbs + protein",
      body: "Blend 1 banana, 200ml milk, 1 scoop protein powder, and a handful of berries. This provides the 3:1 carb-to-protein ratio optimal for post-run recovery.",
    },
    {
      category: "nutrition",
      trigger: "daily",
      severity: "info",
      title: "Hydration: 35ml per kg bodyweight",
      body: "Drink at least 35ml of water per kilogram of bodyweight daily. Add 500-750ml for every hour of running. Check urine color: pale yellow means well hydrated.",
    },
    {
      category: "nutrition",
      trigger: "post_long_run",
      severity: "action",
      title: "Electrolytes after 90+ min runs",
      body: "Runs over 90 minutes deplete sodium, potassium, and magnesium. Take an electrolyte tablet or drink with at least 500mg sodium per liter within 30 minutes of finishing.",
    },
    {
      category: "nutrition",
      trigger: "daily",
      severity: "info",
      title: "Omega-3: anti-inflammatory support",
      body: "Consume omega-3 fatty acids through oily fish twice per week or supplement with 1-2g EPA/DHA daily. Omega-3s reduce exercise-induced inflammation and joint stiffness.",
    },
    {
      category: "nutrition",
      trigger: "daily",
      severity: "info",
      title: "Vitamin D: check your levels",
      body: "Runners training in northern latitudes often have low vitamin D. Supplement 1000-2000 IU daily in winter months. Vitamin D supports bone density and immune function.",
    },
    {
      category: "nutrition",
      trigger: "high_load_week",
      severity: "action",
      title: "Increase carbs during build weeks",
      body: "During high-volume build weeks, increase daily carbohydrate intake to 6-8g per kg bodyweight. Underfueling during hard training blocks leads to breakdown, not adaptation.",
    },
    {
      category: "nutrition",
      trigger: "daily",
      severity: "info",
      title: "Magnesium: 400mg daily",
      body: "Magnesium supports muscle relaxation and sleep quality. Aim for 400mg daily from foods (dark chocolate, nuts, leafy greens) or supplements taken in the evening.",
    },
    {
      category: "nutrition",
      trigger: "post_run",
      severity: "info",
      title: "Tart cherry juice: reduce soreness",
      body: "Drinking 250ml of tart cherry juice post-run has been shown to reduce muscle soreness and inflammation markers. Effective before and after hard training days.",
      source: "Scandinavian Journal of Medicine & Science in Sports, 2010",
    },
    {
      category: "nutrition",
      trigger: "daily",
      severity: "warning",
      title: "Avoid training on empty stomach",
      body: "Fasted running for longer than 45 minutes increases cortisol and muscle breakdown. Eat at least a banana or energy bar before morning runs exceeding 45 minutes.",
    },
    {
      category: "nutrition",
      trigger: "recovery_day",
      severity: "info",
      title: "Recovery day: keep protein high",
      body: "Muscle repair peaks 24-48 hours after hard training. Maintain high protein intake on recovery days: 25-30g per meal across 4 meals to support tissue repair.",
    },
    {
      category: "nutrition",
      trigger: "daily",
      severity: "info",
      title: "Caffeine: 3-6mg/kg before runs",
      body: "Caffeine improves endurance performance by 2-4%. Take 3-6mg per kg bodyweight 30-60 minutes before key sessions. Avoid after 2pm to protect sleep quality.",
      source: "ISSN Position Stand on Caffeine, 2021",
    },
    {
      category: "nutrition",
      trigger: "post_long_run",
      severity: "action",
      title: "Eat within the glycogen window",
      body: "Glycogen synthase enzyme activity peaks in the first 30 minutes post-exercise. Eating carbs during this window replenishes stores 50% faster than waiting 2 hours.",
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // SLEEP (12+ tips)
    // ═══════════════════════════════════════════════════════════════════════════
    {
      category: "sleep",
      trigger: "daily",
      severity: "info",
      title: "Target 7.5-9 hours of sleep",
      body: "Runners need 7.5-9 hours of sleep for optimal recovery and performance. Growth hormone release peaks during deep sleep in the first 3-4 hours of the night.",
      source: "Sleep Foundation Guidelines for Athletes",
    },
    {
      category: "sleep",
      trigger: "daily",
      severity: "action",
      title: "Consistent bedtime: same time daily",
      body: "Go to bed within 30 minutes of the same time every night, including weekends. Consistent circadian rhythm improves sleep quality more than total sleep duration.",
    },
    {
      category: "sleep",
      trigger: "daily",
      severity: "info",
      title: "No screens 60 min before bed",
      body: "Blue light from screens suppresses melatonin production by up to 50%. Switch to a book, stretching, or meditation 60 minutes before your target bedtime.",
    },
    {
      category: "sleep",
      trigger: "daily",
      severity: "action",
      title: "Cool bedroom: 18-19 degrees C",
      body: "Core body temperature must drop for sleep onset. Keep your bedroom at 18-19 degrees C. A too-warm room delays sleep onset and reduces deep sleep duration.",
    },
    {
      category: "sleep",
      trigger: "post_hard_run",
      severity: "info",
      title: "Extra 30 min sleep after hard days",
      body: "After hard training sessions, aim for an extra 30 minutes of sleep. Hard efforts increase inflammation and muscle damage that require additional sleep-based recovery.",
    },
    {
      category: "sleep",
      trigger: "daily",
      severity: "warning",
      title: "No caffeine after 2pm",
      body: "Caffeine has a half-life of 5-6 hours. Coffee at 2pm means half the caffeine is still active at 8pm, reducing deep sleep quality even if you fall asleep on time.",
    },
    {
      category: "sleep",
      trigger: "high_load_week",
      severity: "action",
      title: "Prioritize sleep during build weeks",
      body: "High-volume training demands more recovery. Add 30-60 extra minutes of sleep during build weeks. Sleep debt accumulated during hard training blocks limits adaptation.",
    },
    {
      category: "sleep",
      trigger: "daily",
      severity: "info",
      title: "Morning sunlight: 10 min outside",
      body: "Get 10 minutes of natural sunlight within 1 hour of waking. Morning light exposure sets your circadian clock and improves both alertness and evening sleep onset.",
    },
    {
      category: "sleep",
      trigger: "daily",
      severity: "action",
      title: "Pre-sleep routine: 15 min wind-down",
      body: "Create a consistent 15-minute pre-sleep routine: dim lights, light stretching or breathing exercises, and avoid stimulating content. Routines signal your brain to prepare for sleep.",
    },
    {
      category: "sleep",
      trigger: "recovery_day",
      severity: "info",
      title: "Nap 20-30 min max on rest days",
      body: "A 20-30 minute nap between 1-3pm can restore alertness without affecting nighttime sleep. Avoid naps longer than 30 minutes as they cause sleep inertia and may disrupt your night.",
    },
    {
      category: "sleep",
      trigger: "daily",
      severity: "info",
      title: "Magnesium glycinate before bed",
      body: "Take 200-400mg magnesium glycinate 30-60 minutes before bed. This form crosses the blood-brain barrier and promotes muscle relaxation and sleep quality.",
    },
    {
      category: "sleep",
      trigger: "daily",
      severity: "warning",
      title: "Alcohol disrupts deep sleep",
      body: "Even 1-2 drinks reduce REM and deep sleep by 20-40%. Avoid alcohol within 3 hours of bedtime, especially during build weeks when recovery demands are highest.",
    },
    {
      category: "sleep",
      trigger: "post_long_run",
      severity: "action",
      title: "Sleep 8+ hours after long runs",
      body: "Long runs deplete glycogen and create micro-damage. Sleep at least 8 hours the night after your long run. Consider going to bed 30 minutes earlier than usual.",
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // MOBILITY (15+ tips)
    // ═══════════════════════════════════════════════════════════════════════════
    {
      category: "mobility",
      trigger: "daily",
      severity: "action",
      title: "Hip flexor stretch: 2x30s each",
      body: "Kneel in a lunge position, push hips forward until you feel a stretch in the front of your rear hip. Hold 30 seconds per side, twice. Tight hip flexors alter running gait.",
    },
    {
      category: "mobility",
      trigger: "post_run",
      severity: "action",
      title: "Calf stretch: 3x30s each side",
      body: "Place hands on a wall, step one foot back with heel flat. Lean forward to stretch the gastrocnemius for 30 seconds. Then bend the rear knee slightly for the soleus. 3 sets each.",
    },
    {
      category: "mobility",
      trigger: "daily",
      severity: "action",
      title: "Ankle dorsiflexion mobilization",
      body: "In a half-kneeling position, push your front knee over your toes while keeping the heel down. Hold 5 seconds, return. Do 15 reps per side. Targets the ankle joint critical for running mechanics.",
    },
    {
      category: "mobility",
      trigger: "daily",
      severity: "action",
      title: "90/90 hip rotation: 10 reps",
      body: "Sit with both legs at 90-degree angles. Rotate from one side to the other, keeping your back tall. Do 10 controlled transitions. This opens internal and external hip rotation.",
    },
    {
      category: "mobility",
      trigger: "recovery_day",
      severity: "action",
      title: "Full body mobility: 15 min",
      body: "Spend 15 minutes working through ankles, hips, thoracic spine, and shoulders. Cat-cow, world's greatest stretch, and leg swings make a complete runner's mobility routine.",
    },
    {
      category: "mobility",
      trigger: "post_run",
      severity: "action",
      title: "Pigeon pose: 60s each side",
      body: "From a plank position, bring one knee forward and lower your hips. Hold for 60 seconds per side. Pigeon pose releases the deep hip rotators that tighten from running.",
    },
    {
      category: "mobility",
      trigger: "daily",
      severity: "action",
      title: "Thoracic spine rotation: 10 each",
      body: "Lie on your side with knees stacked and bent. Open your top arm across your body, following with your eyes. 10 rotations each side. Running requires torso rotation that tight T-spines limit.",
    },
    {
      category: "mobility",
      trigger: "post_long_run",
      severity: "action",
      title: "Hamstring stretch: PNF 3x20s",
      body: "Lie on your back, leg raised with a band. Stretch for 5 seconds, push against the band for 5 seconds, then stretch deeper for 20 seconds. PNF stretching gains range faster than static alone.",
    },
    {
      category: "mobility",
      trigger: "daily",
      severity: "info",
      title: "Dynamic warm-up before every run",
      body: "Replace static stretching before runs with dynamic movements: leg swings (10 each direction), high knees (20), butt kicks (20), and walking lunges (10). Takes 3 minutes.",
    },
    {
      category: "mobility",
      trigger: "rest_day",
      severity: "action",
      title: "Couch stretch: 2 min each side",
      body: "Place one knee against a wall with your shin vertical, other foot forward in a lunge. Hold for 2 minutes per side. This aggressively opens the hip flexors and quads.",
    },
    {
      category: "mobility",
      trigger: "daily",
      severity: "action",
      title: "Foot and toe mobilization: 3 min",
      body: "Spread your toes wide, then curl them tight. Repeat 15 times. Roll a golf ball under each foot for 60 seconds. Strong, mobile feet reduce compensatory tibialis anterior strain.",
    },
    {
      category: "mobility",
      trigger: "post_run",
      severity: "action",
      title: "IT band foam roll: 2 min each leg",
      body: "Lie on your side with the foam roller under your outer thigh. Roll from hip to just above the knee for 2 minutes per leg. IT band tightness alters knee tracking and shin mechanics.",
    },
    {
      category: "mobility",
      trigger: "daily",
      severity: "info",
      title: "Sit less: stand up every 45 min",
      body: "Prolonged sitting tightens hip flexors and weakens glutes. Set a timer to stand and move for 2 minutes every 45 minutes. This preserves the mobility gains from your stretching.",
    },
    {
      category: "mobility",
      trigger: "recovery_day",
      severity: "action",
      title: "Adductor stretch: 3x30s",
      body: "Stand wide, shift weight to one side and bend that knee while keeping the other leg straight. Hold 30 seconds per side, 3 rounds. Inner thigh tightness affects hip stability during running.",
    },
    {
      category: "mobility",
      trigger: "post_hard_run",
      severity: "action",
      title: "Quad stretch with hip tilt: 30s",
      body: "Stand on one foot, pull the other heel to your glute, then tilt your pelvis under (posterior tilt). Hold 30 seconds per side. The pelvic tilt deepens the quad and hip flexor stretch.",
    },
    {
      category: "mobility",
      trigger: "daily",
      severity: "action",
      title: "Glute bridge with hold: 3x10",
      body: "Lie on your back, feet flat, push hips up and squeeze glutes at the top for 3 seconds. 3 sets of 10 reps. Bridges activate glutes and improve hip extension mobility simultaneously.",
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // STRENGTH (15+ tips)
    // ═══════════════════════════════════════════════════════════════════════════
    {
      category: "strength",
      trigger: "daily",
      severity: "action",
      title: "Single-leg calf raise: 3x15",
      body: "Stand on one foot on a step edge. Rise up fully, lower slowly below the step level. 3x15 per leg. Calf strength directly reduces tibialis anterior overload by balancing shin and calf forces.",
    },
    {
      category: "strength",
      trigger: "daily",
      severity: "action",
      title: "Single-leg squats: 3x10 each",
      body: "Stand on one leg, lower into a partial squat keeping your knee tracking over your toes. 3 sets of 10 per leg. Single-leg strength prevents gait asymmetries that overload the tibialis anterior.",
    },
    {
      category: "strength",
      trigger: "daily",
      severity: "action",
      title: "Nordic hamstring curls: 3x5",
      body: "Kneel with feet anchored, slowly lower your body forward using only hamstring control. 3 sets of 5 reps. Nordic curls reduce hamstring injury risk by 51% in runners.",
      source: "British Journal of Sports Medicine, 2019",
    },
    {
      category: "strength",
      trigger: "daily",
      severity: "action",
      title: "Bulgarian split squat: 3x10",
      body: "Rear foot elevated on a bench. Lower until your front thigh is parallel. 3x10 per leg with bodyweight or dumbbells. Builds single-leg stability essential for hill running.",
    },
    {
      category: "strength",
      trigger: "daily",
      severity: "action",
      title: "Side plank: 3x30s each side",
      body: "Hold a side plank with your body in a straight line for 30 seconds per side. 3 sets. Hip abductor strength from side planks prevents inward knee collapse that stresses the shin.",
    },
    {
      category: "strength",
      trigger: "daily",
      severity: "action",
      title: "Deadlift: 3x8 moderate weight",
      body: "Perform Romanian deadlifts with moderate weight: 3 sets of 8 reps. Focus on hinging at the hips. Deadlifts strengthen the posterior chain, protecting knees and reducing shin loading.",
      min_weekly_km: 20,
    },
    {
      category: "strength",
      trigger: "rest_day",
      severity: "action",
      title: "Gym session: lower body focus",
      body: "Use rest days for lower body strength: squats, lunges, calf raises, and hip thrusts. 2 gym sessions per week reduces running injury risk by 50%.",
      source: "Lauersen et al., British Journal of Sports Medicine, 2014",
    },
    {
      category: "strength",
      trigger: "daily",
      severity: "action",
      title: "Plank: 3x45s",
      body: "Hold a forearm plank with glutes and core engaged for 45 seconds. 3 sets. Core stability prevents excessive trunk sway that transmits extra force through the lower legs.",
    },
    {
      category: "strength",
      trigger: "daily",
      severity: "info",
      title: "Strength before speed in training",
      body: "Build a 6-week strength base before adding speed work. Tendons adapt 3-5x slower than muscles. Without structural strength, fast running overloads connective tissue including the tibialis anterior.",
    },
    {
      category: "strength",
      trigger: "daily",
      severity: "action",
      title: "Hip abduction: banded walks 3x15",
      body: "Place a resistance band above your knees. Walk sideways 15 steps each direction, 3 sets. Strong hip abductors prevent knee valgus that increases tibialis anterior strain.",
    },
    {
      category: "strength",
      trigger: "daily",
      severity: "action",
      title: "Step-ups: 3x10 each leg",
      body: "Step onto a 30-40cm box with one foot, drive up without pushing off the floor foot. 3x10 per leg. Step-ups build the eccentric quad control needed for downhill running.",
    },
    {
      category: "strength",
      trigger: "recovery_day",
      severity: "action",
      title: "Glute bridges: 3x15 reps",
      body: "Lie on your back, feet flat, drive hips up squeezing glutes at the top. 3 sets of 15. Weak glutes are the number one cause of compensatory lower leg overload in runners.",
    },
    {
      category: "strength",
      trigger: "high_load_week",
      severity: "info",
      title: "Reduce gym intensity this week",
      body: "During high-volume running weeks, lower gym weights by 20-30% and reduce sets. Heavy lifting competes for recovery resources and can compound running fatigue.",
    },
    {
      category: "strength",
      trigger: "daily",
      severity: "action",
      title: "Wall sit: 3x45s",
      body: "Lean against a wall with thighs parallel to the floor. Hold 45 seconds, 3 sets. Isometric quad strength improves shock absorption on landing, reducing tibialis anterior demand.",
    },
    {
      category: "strength",
      trigger: "daily",
      severity: "action",
      title: "Single-leg RDL: 3x8 each",
      body: "Stand on one leg, hinge forward keeping a flat back, lower a weight toward the ground. 3x8 per leg. Trains balance and posterior chain in a running-specific single-leg pattern.",
    },
    {
      category: "strength",
      trigger: "rest_day",
      severity: "info",
      title: "2 strength sessions per week",
      body: "Research shows 2 strength sessions per week is the minimum effective dose for injury prevention in runners. Schedule them on easy or rest days, not after hard runs.",
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // FORM (12+ tips)
    // ═══════════════════════════════════════════════════════════════════════════
    {
      category: "form",
      trigger: "post_run",
      severity: "info",
      title: "Check cadence: aim for 170-180",
      body: "Optimal cadence for most runners is 170-180 steps per minute. Lower cadence means longer ground contact time, which increases tibialis anterior loading. Use a metronome app to check.",
    },
    {
      category: "form",
      trigger: "daily",
      severity: "info",
      title: "Land with midfoot, not heel",
      body: "A midfoot landing under your center of mass reduces braking forces by 30%. Heel striking far ahead of your body forces the tibialis anterior to work harder to control foot slap.",
    },
    {
      category: "form",
      trigger: "daily",
      severity: "action",
      title: "Shorten your stride by 5-10%",
      body: "Overstriding is the most common form error causing tibialis anterior pain. Shorten your stride slightly and increase cadence. You should feel like you are running under yourself.",
    },
    {
      category: "form",
      trigger: "post_run",
      severity: "info",
      title: "Lean forward from ankles, not waist",
      body: "A slight forward lean from the ankles (not the waist) uses gravity to assist forward motion. Leaning from the waist compresses the hip flexors and alters lower leg mechanics.",
    },
    {
      category: "form",
      trigger: "daily",
      severity: "action",
      title: "Run strides: 6x100m twice a week",
      body: "After an easy run, do 6x100m accelerations building to 90% effort. Strides reinforce efficient mechanics at speed without the fatigue of a full interval session.",
    },
    {
      category: "form",
      trigger: "post_long_run",
      severity: "info",
      title: "Form breaks down when tired",
      body: "In the final 5km of long runs, actively focus on maintaining posture and cadence. Fatigue causes heel striking and overpronation that stress the tibialis anterior.",
    },
    {
      category: "form",
      trigger: "daily",
      severity: "action",
      title: "Arm swing: elbows at 90 degrees",
      body: "Keep elbows bent at roughly 90 degrees and swing arms forward-back, not across your body. Cross-body arm swing creates rotational forces that destabilize lower leg mechanics.",
    },
    {
      category: "form",
      trigger: "daily",
      severity: "info",
      title: "Relax your feet on the run",
      body: "Consciously relax your toes and feet mid-run. Gripping the ground with your toes causes the tibialis anterior to stay contracted. Think about running with floppy feet.",
    },
    {
      category: "form",
      trigger: "post_run",
      severity: "action",
      title: "Film your running form monthly",
      body: "Record yourself running from the side and behind once a month. Look for overstriding, heel striking, excessive knee valgus, and trunk sway. Visual feedback accelerates form correction.",
    },
    {
      category: "form",
      trigger: "daily",
      severity: "info",
      title: "Eyes forward, head level",
      body: "Look 15-20 meters ahead, not at your feet. A forward head position increases tension through the entire posterior chain and alters foot strike mechanics.",
    },
    {
      category: "form",
      trigger: "post_hard_run",
      severity: "info",
      title: "Pace affects form: slow down",
      body: "Running faster than your training pace encourages overstriding and heel striking. During easy runs, slow down enough that your form stays relaxed and efficient.",
    },
    {
      category: "form",
      trigger: "daily",
      severity: "action",
      title: "High knees drill: 2x20m",
      body: "Before runs, do 2x20m of high knees with quick ground contact. This drill teaches the hip flexors to lift the leg efficiently, reducing compensatory tibialis anterior recruitment.",
    },
    {
      category: "form",
      trigger: "daily",
      severity: "info",
      title: "Quiet feet = efficient running",
      body: "Listen to your footfall. Loud slapping means the tibialis anterior is losing control of dorsiflexion at impact. Aim for quiet, light landings by pulling your feet under your hips.",
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // PREHAB (12+ tips)
    // ═══════════════════════════════════════════════════════════════════════════
    {
      category: "prehab",
      trigger: "daily",
      severity: "action",
      title: "Ankle stability: single-leg balance",
      body: "Stand on one foot for 30 seconds with eyes open, then 30 seconds with eyes closed. Repeat each side twice. Ankle instability forces the tibialis anterior to overwork as a stabilizer.",
    },
    {
      category: "prehab",
      trigger: "daily",
      severity: "action",
      title: "Eccentric calf drops: 3x15",
      body: "Stand on a step edge on one foot. Rise up on toes, then lower your heel below the step over 3 seconds. 3x15 per leg. Eccentric calf loading prevents Achilles tendinopathy.",
    },
    {
      category: "prehab",
      trigger: "daily",
      severity: "action",
      title: "Short foot exercise: 3x10 each",
      body: "While standing, shorten your foot by pulling the ball of your foot toward your heel without curling toes. Hold 5 seconds, 10 reps. This activates the arch muscles that support the tibialis anterior.",
    },
    {
      category: "prehab",
      trigger: "recovery_day",
      severity: "action",
      title: "Full prehab circuit: 15 min",
      body: "Toe raises (15), calf raises (15), single-leg balance (30s), hip abduction (15), glute bridges (15), ankle circles (20). Do this circuit on every recovery day to maintain structural resilience.",
    },
    {
      category: "prehab",
      trigger: "daily",
      severity: "info",
      title: "Tendons need consistent loading",
      body: "Tendons strengthen through regular, progressive loading over 12+ weeks. Missing prehab sessions for even 2 weeks can reverse 50% of tendon adaptation gains. Consistency beats intensity.",
    },
    {
      category: "prehab",
      trigger: "daily",
      severity: "action",
      title: "Peroneal strengthening: 3x12",
      body: "Loop a band around your forefoot, anchor the other end medially. Evert your foot outward against resistance. 3x12 per foot. Peroneal strength balances the tibialis anterior's inversion force.",
    },
    {
      category: "prehab",
      trigger: "high_load_week",
      severity: "warning",
      title: "Do not skip prehab this week",
      body: "High-volume weeks are when injuries happen. Maintain your full prehab routine even when tired. Cutting prehab during build weeks is the most common precursor to tibialis anterior flare-ups.",
    },
    {
      category: "prehab",
      trigger: "daily",
      severity: "action",
      title: "Towel toe curls: 3x15 each foot",
      body: "Place a towel flat on the floor. Use your toes to scrunch it toward you, 15 reps per foot. This strengthens intrinsic foot muscles that reduce demand on the tibialis anterior.",
    },
    {
      category: "prehab",
      trigger: "daily",
      severity: "action",
      title: "Bosu ball balance: 2x30s each",
      body: "Stand on a Bosu ball (or folded towel) on one foot for 30 seconds. The unstable surface trains the ankle stabilizers including the tibialis anterior in a functional context.",
    },
    {
      category: "prehab",
      trigger: "rest_day",
      severity: "action",
      title: "Toe spacer wear: 30 min daily",
      body: "Wear toe spacers for 30 minutes daily on rest days. Spreading the toes activates the intrinsic foot muscles and improves forefoot mechanics that reduce tibialis anterior compensation.",
    },
    {
      category: "prehab",
      trigger: "post_long_run",
      severity: "action",
      title: "Prehab circuit after long runs",
      body: "Within 2 hours of your long run, do a gentle prehab set: 10 easy toe raises, 10 ankle circles each way, and 30s single-leg balance each side. Movement prevents post-run stiffness.",
    },
    {
      category: "prehab",
      trigger: "daily",
      severity: "info",
      title: "Pain is a signal, not a badge",
      body: "Sharp or worsening pain in the shin during a run means stop and walk. Continuing through tibialis anterior pain risks stress fractures. Mild soreness after running is acceptable; pain during is not.",
    },
    {
      category: "prehab",
      trigger: "daily",
      severity: "action",
      title: "Marble pickups: 20 per foot",
      body: "Place 20 marbles on the floor and pick them up one at a time with your toes. This builds fine motor control in the foot muscles that share load with the tibialis anterior.",
    },
    {
      category: "prehab",
      trigger: "recovery_day",
      severity: "action",
      title: "Resistance band 4-way ankle: 2x10",
      body: "Anchor a band and move your foot in dorsiflexion, plantarflexion, inversion, and eversion. 2x10 each direction. Balanced ankle strength prevents compensatory tibialis anterior overload.",
    },
  ];

  for (const tip of tips) {
    await insertTip(tip);
  }

  return tips.length;
}

// ─── Select daily tips ────────────────────────────────────────────────────────

export async function selectDailyTips(
  date: string,
  weeklyVolumeKm: number,
  athleteId?: string,
): Promise<Tip[]> {
  const recentIds = await getRecentlyShownTipIds(14, athleteId);
  const recentTibIds = await getRecentlyShownTipIds(2, athleteId);

  // Gather candidate pools
  const dailyTips = await getTipsByTrigger("daily", weeklyVolumeKm, athleteId);
  const restDayTips = await getTipsByTrigger("rest_day", weeklyVolumeKm, athleteId);
  const recoveryDayTips = await getTipsByTrigger("recovery_day", weeklyVolumeKm, athleteId);

  const allCandidates = [...dailyTips, ...restDayTips, ...recoveryDayTips];
  const filtered = allCandidates.filter((t) => !recentIds.includes(t.id));

  // Check if a tibialis_anterior tip has been shown in the last 2 days
  const tibCandidates = filtered.filter((t) => t.category === "tibialis_anterior");
  const tibShownRecently = tibCandidates.some((t) => recentTibIds.includes(t.id));
  const tibAllInCategory = await getTipsByCategory("tibialis_anterior", weeklyVolumeKm, athleteId);
  const tibNeverShownRecently = tibAllInCategory.filter((t) => recentTibIds.includes(t.id)).length === 0;
  const needsTib = tibNeverShownRecently || !tibShownRecently;

  const seed = hashDate(date);
  const rng = seededRandom(seed);

  const selected: Tip[] = [];

  // If we need a tibialis anterior tip and have candidates, pick one first
  if (needsTib && tibCandidates.length > 0) {
    const shuffled = [...tibCandidates].sort(() => rng() - 0.5);
    selected.push(shuffled[0]);
  }

  // Fill remaining slots from non-selected filtered tips
  const remaining = filtered.filter((t) => !selected.some((s) => s.id === t.id));

  // If we already picked a tib tip, pick the second from non-tib to ensure variety
  const secondPool = selected.length > 0 ? remaining.filter((t) => t.category !== "tibialis_anterior") : remaining;

  const pool = secondPool.length > 0 ? secondPool : remaining;
  const shuffledPool = [...pool].sort(() => rng() - 0.5);

  while (selected.length < 2 && shuffledPool.length > 0) {
    selected.push(shuffledPool.shift()!);
  }

  // Fallback: if we still don't have 2 tips, pull from unfiltered candidates
  if (selected.length < 2) {
    const fallback = allCandidates
      .filter((t) => !selected.some((s) => s.id === t.id))
      .sort(() => rng() - 0.5);
    while (selected.length < 2 && fallback.length > 0) {
      selected.push(fallback.shift()!);
    }
  }

  // Record that these tips were shown today
  const today = date;
  for (const tip of selected) {
    await recordTipShown(tip.id, today, "daily", athleteId);
  }

  return selected;
}

// ─── Select post-run tips ─────────────────────────────────────────────────────

export async function selectPostRunTips(
  run: Activity,
  weeklyVolumeKm: number,
  athleteId?: string,
): Promise<Tip[]> {
  const distanceKm = run.distance / 1000;
  const paceMinPerKm = run.moving_time / 60 / (distanceKm || 1);
  const sufferScore = run.suffer_score ?? 0;
  const elevation = run.total_elevation_gain;

  // Determine triggers based on run characteristics
  const triggers: string[] = ["post_run"];

  const isLongRun = distanceKm > 15;
  const isHardRun = sufferScore > 100 || paceMinPerKm < 5.0;
  const isHighElevation = elevation > 300;
  const isRecoveryRun = distanceKm < 5;

  if (isLongRun) triggers.push("post_long_run");
  if (isHardRun) triggers.push("post_hard_run");

  // Collect candidates from all applicable triggers
  let candidates: Tip[] = [];
  for (const trigger of triggers) {
    const tips = await getTipsByTrigger(trigger, weeklyVolumeKm, athleteId);
    candidates.push(...tips);
  }

  // Deduplicate by id
  const seen = new Set<number>();
  candidates = candidates.filter((t) => {
    if (seen.has(t.id)) return false;
    seen.add(t.id);
    return true;
  });

  // Exclude recently shown (last 7 days for post-run context)
  const recentIds = await getRecentlyShownTipIds(7, athleteId);
  const filtered = candidates.filter((t) => !recentIds.includes(t.id));
  const pool = filtered.length > 0 ? filtered : candidates;

  // Deterministic seed from run start date
  const seed = hashDate(run.start_date + run.strava_id);
  const rng = seededRandom(seed);

  // Score and prioritize tips based on run characteristics
  const scored = pool.map((tip) => {
    let score = rng() * 0.3; // base random factor

    // Tibialis anterior tips get priority after any run
    if (tip.category === "tibialis_anterior") score += 0.4;

    // Category relevance based on run type
    if (isLongRun && (tip.category === "recovery" || tip.category === "nutrition")) score += 0.3;
    if (isHardRun && (tip.category === "recovery" || tip.category === "form")) score += 0.3;
    if (isHighElevation && (tip.category === "strength" || tip.category === "mobility")) score += 0.25;
    if (isRecoveryRun && (tip.category === "mobility" || tip.category === "prehab")) score += 0.25;

    // Severity weighting
    if (tip.severity === "action") score += 0.15;
    if (tip.severity === "warning") score += 0.1;

    return { tip, score };
  });

  scored.sort((a, b) => b.score - a.score);

  // Return 1-2 tips: always 1, and a second if the run was significant
  const count = isLongRun || isHardRun || isHighElevation ? 2 : 1;
  const selected = scored.slice(0, count).map((s) => s.tip);

  // Record shown
  const today = toLocalDateStr(new Date(run.start_date));
  for (const tip of selected) {
    await recordTipShown(
      tip.id,
      today,
      isLongRun ? "post_long_run" : isHardRun ? "post_hard_run" : "post_run",
      athleteId,
    );
  }

  return selected;
}
