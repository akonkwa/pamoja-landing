import { NextResponse } from "next/server";
import { askInsight } from "../../../../lib/workspace-state";

export async function POST(request) {
  const body = await request.json();
  if (!body.question) {
    return NextResponse.json({ error: "Question is required" }, { status: 400 });
  }
  return NextResponse.json(await askInsight(body.question));
}
