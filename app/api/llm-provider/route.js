import { NextResponse } from "next/server";
import store from "../../../lib/store";
import { getProviderSettings, resolveProvider } from "../../../lib/openai";

const { updateDbAsync } = store;

export async function POST(request) {
  const body = await request.json();
  const provider = resolveProvider(body?.provider);

  if (!provider) {
    return NextResponse.json({ error: "Requested provider is not configured." }, { status: 400 });
  }

  if (!getProviderSettings(provider)) {
    return NextResponse.json({ error: "Requested provider is unavailable." }, { status: 400 });
  }

  let payload = null;

  await updateDbAsync(async (db) => {
    db.meta = {
      ...(db.meta || {}),
      llmProvider: provider,
    };

    payload = { provider };
    return db;
  });

  return NextResponse.json(payload, { status: 200 });
}
