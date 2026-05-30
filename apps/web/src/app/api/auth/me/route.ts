import { readSessionAddress } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const address = await readSessionAddress();
  return Response.json({ address });
}
