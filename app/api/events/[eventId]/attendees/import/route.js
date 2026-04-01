import { NextResponse } from "next/server";
import store from "../../../../../../lib/store";
import pamojaService from "../../../../../../lib/pamoja-service";

const { updateDb } = store;
const { importAttendeesAction } = pamojaService;

export async function POST(request, { params }) {
  const body = await request.json();
  let payload;

  try {
    updateDb((db) => {
      payload = importAttendeesAction(db, params.eventId, body.csvText);
      return db;
    });
  } catch (error) {
    const status = error.message === "Event not found." ? 404 : 400;
    return NextResponse.json({ error: error.message }, { status });
  }

  return NextResponse.json(payload, { status: 201 });
}
