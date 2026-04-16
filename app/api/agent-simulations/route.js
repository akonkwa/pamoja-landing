import { NextResponse } from "next/server";
import store from "../../../lib/store";
import pamojaService from "../../../lib/pamoja-service";

const { updateDbAsync } = store;
const { simulateAgentIterationAction } = pamojaService;

export async function POST(request) {
  const body = await request.json();
  let payload;

  try {
    await updateDbAsync(async (db) => {
      payload = await simulateAgentIterationAction(db, body);
      return db;
    });
  } catch (error) {
    const status = error.message === "Profile Agent not found." ? 404 : 400;
    return NextResponse.json({ error: error.message }, { status });
  }

  return NextResponse.json(payload, { status: 201 });
}
