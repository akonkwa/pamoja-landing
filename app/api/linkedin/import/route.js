import { NextResponse } from "next/server";
import { persistLinkedInImport } from "../../../../lib/workspace-state";

export async function POST(request) {
  const body = await request.json();
  if (!body || !Array.isArray(body.people || body.connections || [])) {
    return NextResponse.json(
      { error: "Expected JSON payload with a people or connections array" },
      { status: 400 }
    );
  }
  return NextResponse.json(persistLinkedInImport(body));
}
