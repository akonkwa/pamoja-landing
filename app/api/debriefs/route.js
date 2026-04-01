import { NextResponse } from "next/server";
import store from "../../../lib/store";
import pamojaService from "../../../lib/pamoja-service";

const { updateDb } = store;
const { debriefAction } = pamojaService;

export async function POST(request) {
  const body = await request.json();
  let payload;

  try {
    updateDb((db) => {
      payload = debriefAction(db, body);
      return db;
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return NextResponse.json(payload, { status: 201 });
}
