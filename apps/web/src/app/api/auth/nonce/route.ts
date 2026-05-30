import type { NextRequest } from "next/server";
import { generateNonce } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");
  if (!address || !address.startsWith("0x") || address.length !== 42) {
    return Response.json({ error: "address required" }, { status: 400 });
  }
  const nonce = generateNonce(address as `0x${string}`);
  return Response.json({ nonce });
}
