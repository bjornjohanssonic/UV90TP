import { NextRequest, NextResponse } from "next/server";
import { getAllShoes, createShoe } from "@/lib/shoes";
import { getAuthenticatedAthleteId } from "@/lib/session";
import type { ShoeType } from "@/types";

export async function GET() {
  const athleteId = await getAuthenticatedAthleteId();
  if (!athleteId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const shoes = await getAllShoes(athleteId);
  return NextResponse.json(shoes);
}

export async function POST(req: NextRequest) {
  const athleteId = await getAuthenticatedAthleteId();
  if (!athleteId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json();
  const name = (body.name ?? "").trim();
  const type: ShoeType = body.type ?? "road";

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const validTypes: ShoeType[] = ["road", "trail", "hybrid", "dubb", "gore_tex"];
  if (!validTypes.includes(type)) {
    return NextResponse.json({ error: "invalid type" }, { status: 400 });
  }

  const shoe = await createShoe(name, type, athleteId);
  return NextResponse.json(shoe, { status: 201 });
}
