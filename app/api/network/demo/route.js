import { NextResponse } from "next/server";
import { loadDemoState } from "../../../../lib/workspace-state";

export async function POST() {
  return NextResponse.json(loadDemoState());
}
