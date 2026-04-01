import { NextResponse } from "next/server";
import { updateWeights } from "../../../../lib/workspace-state";

export async function POST(request) {
  const body = await request.json();
  return NextResponse.json(updateWeights(body));
}
