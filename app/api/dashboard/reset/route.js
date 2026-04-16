import { NextResponse } from "next/server";
import store from "../../../../lib/store";
import pamojaService from "../../../../lib/pamoja-service";

const { resetDb } = store;
const { buildDashboardPayload } = pamojaService;

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const resetCode = process.env.RESET_UNIVERSE_CODE;
  const requiresResetCode = process.env.NODE_ENV === "production";

  if (requiresResetCode && (!resetCode || body?.code !== resetCode)) {
    return NextResponse.json({ error: "Reset not authorized." }, { status: 403 });
  }

  const db = resetDb();
  return NextResponse.json(buildDashboardPayload(db));
}
