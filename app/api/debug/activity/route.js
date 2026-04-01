import { NextResponse } from "next/server";
import { readEventLog, readRawImports, readState, readVaultSnapshots } from "../../../../lib/fs-store";

export async function GET() {
  const state = readState();
  const events = readEventLog(30);
  const snapshots = readVaultSnapshots(6);
  const imports = readRawImports(6);

  return NextResponse.json({
    events,
    latestSnapshot: snapshots[0] || null,
    latestImport: imports[0] || null,
    stateSummary: {
      importSource: state.importSource,
      peopleCount: state.people?.length || 0,
      edgeCount: state.edges?.length || 0,
      importedAt: state.importMeta?.importedAt || null,
    },
  });
}
