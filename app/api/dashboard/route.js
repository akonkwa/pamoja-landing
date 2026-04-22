import { NextResponse } from "next/server";
import store from "../../../lib/store";
import pamojaService from "../../../lib/pamoja-service";

const { readDb } = store;
const { buildDashboardPayload } = pamojaService;

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const db = readDb();
  return NextResponse.json(buildDashboardPayload(db), {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
