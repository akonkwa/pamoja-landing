import { NextResponse } from "next/server";
import store from "../../../../../lib/store";
import pamojaService from "../../../../../lib/pamoja-service";

const { updateDb } = store;
const { claimProfileAction } = pamojaService;

export async function POST(request, { params }) {
  const body = await request.json();
  let payload;

  try {
    updateDb((db) => {
      payload = claimProfileAction(db, params.profileAgentId, body);
      return db;
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return NextResponse.json(payload);
}
