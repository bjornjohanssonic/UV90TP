import { NextResponse } from "next/server";
import { getAuthenticatedAthleteId } from "@/lib/session";
import { getTipCount } from "@/lib/repositories/tip-repository";

export async function POST() {
  const athleteId = await getAuthenticatedAthleteId();
  if (!athleteId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const existingCount = await getTipCount();
  if (existingCount > 0) {
    return NextResponse.json({ message: "Tips already seeded", count: existingCount });
  }

  // Dynamically import to avoid loading all tip data on every request
  const { seedTips } = await import("@/lib/tips");
  const count = await seedTips();

  return NextResponse.json({ message: "Tips seeded successfully", count });
}
