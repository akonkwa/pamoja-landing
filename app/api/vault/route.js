import { NextResponse } from "next/server";
import { readRawImports, readState, readVaultSnapshots } from "../../../lib/fs-store";

export async function GET() {
  const state = readState();
  return NextResponse.json({
    state: {
      importSource: state.importSource,
      profile: state.profile,
      importMeta: state.importMeta,
      peopleCount: state.people?.length || 0,
      edgeCount: state.edges?.length || 0,
    },
    providerSnapshots: readVaultSnapshots(8),
    rawImports: readRawImports(8),
  });
}
