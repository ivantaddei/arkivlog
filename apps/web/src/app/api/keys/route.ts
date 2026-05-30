import { readSessionAddress } from "@/lib/auth";
import { getOrCreateApiKey } from "@/lib/keystore";
import { getDemoConfig, isDemoMode } from "@/lib/demo-mode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (isDemoMode()) {
    const demo = getDemoConfig();
    return Response.json({
      wallet: demo.wallet,
      apiKey: demo.apiKey,
      projectKey: demo.projectKey,
      projectName: demo.projectName,
      createdAt: 0,
    });
  }
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
