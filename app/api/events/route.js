import { NextResponse } from "next/server";
import store from "../../../lib/store";
import pamojaService from "../../../lib/pamoja-service";

const { updateDb } = store;
const { createEventAction } = pamojaService;

export async function POST(request) {
  const body = await request.json();

  if (!body.title) {
    return NextResponse.json({ error: "Event title is required." }, { status: 400 });
  }

  let payload;
  updateDb((db) => {
    payload = createEventAction(db, body);
    return db;
  });

  return NextResponse.json(payload, { status: 201 });
}
