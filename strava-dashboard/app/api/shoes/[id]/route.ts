import { NextRequest, NextResponse } from "next/server";
import { updateShoe } from "@/lib/shoes";
import { getAuthenticatedAthleteId } from "@/lib/session";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const athleteId = await getAuthenticatedAthleteId();
  if (!athleteId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const shoeId = parseInt(id, 10);
  if (isNaN(shoeId)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  const body = await req.json();
  const updates: { retired?: number; manual_km?: number } = {};
  if (body.retired !== undefined) {
    updates.retired = body.retired ? 1 : 0;
  }
  if (body.manual_km !== undefined) {
    const km = parseFloat(body.manual_km);
    updates.manual_km = isNaN(km) ? 0 : Math.max(0, km);
  }

  const shoe = await updateShoe(shoeId, updates);
  if (!shoe) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json(shoe);
}
