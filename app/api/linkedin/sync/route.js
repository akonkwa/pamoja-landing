import { NextResponse } from "next/server";
import { syncLinkedInProfileState } from "../../../../lib/workspace-state";

export async function POST() {
  try {
    return NextResponse.json(syncLinkedInProfileState());
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
