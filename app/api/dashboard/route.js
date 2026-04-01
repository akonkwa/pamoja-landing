import { NextResponse } from "next/server";
import store from "../../../lib/store";
import pamojaService from "../../../lib/pamoja-service";

const { readDb } = store;
const { buildDashboardPayload } = pamojaService;

export async function GET() {
  const db = readDb();
  return NextResponse.json(buildDashboardPayload(db));
}
