import { readSessionAddress } from "@/lib/auth";
import { getOrCreateApiKey } from "@/lib/keystore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const address = await readSessionAddress();
  if (!address) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }
  try {
    const record = await getOrCreateApiKey(address);
    return Response.json({
      wallet: record.wallet,
      apiKey: record.apiKey,
      projectKey: record.projectKey,
      projectName: record.projectName,
      createdAt: record.createdAt,
    });
  } catch (err) {
    console.error("[GET /api/keys] failed:", err);
    return Response.json(
      {
        error: err instanceof Error ? err.message : "Internal error",
      },
      { status: 500 },
    );
  }
}
