import type { NextRequest } from "next/server";
import { SiweMessage } from "siwe";
import {
  buildSessionCookieHeader,
  consumeNonce,
  signSession,
} from "@/lib/auth";
import { getOrCreateApiKey } from "@/lib/keystore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  message?: string;
  signature?: string;
}

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return Response.json({ error: "invalid JSON" }, { status: 400 });
  }
  const { message, signature } = body;
  if (!message || !signature) {
    return Response.json(
      { error: "message and signature are required" },
      { status: 400 },
    );
  }

  let parsed: SiweMessage;
  try {
    parsed = new SiweMessage(message);
  } catch (err) {
    return Response.json(
      {
        error: `Invalid SIWE message: ${
          err instanceof Error ? err.message : String(err)
        }`,
      },
      { status: 400 },
    );
  }

  try {
    const result = await parsed.verify({ signature });
    if (!result.success || !result.data) {
      return Response.json(
        { error: "Signature verification failed" },
        { status: 401 },
      );
    }
  } catch (err) {
    return Response.json(
      {
        error: `Verification error: ${
          err instanceof Error ? err.message : String(err)
        }`,
      },
      { status: 401 },
    );
  }

  const address = parsed.address as `0x${string}`;
  const nonceOk = consumeNonce(parsed.nonce, address);
  if (!nonceOk) {
    return Response.json(
      { error: "Nonce invalid, expired, or address mismatch" },
      { status: 401 },
    );
  }

  const jwt = await signSession(address);

  // Pre-warm the Project entity + API key so the dashboard doesn't race on the
  // first GET /api/keys (creation blocks ~10s on Arkiv testnet and Strict Mode
  // can lose the response).
  await getOrCreateApiKey(address).catch((err) => {
    console.error("[verify] pre-warm getOrCreateApiKey failed:", err);
  });

  return new Response(JSON.stringify({ address: address.toLowerCase() }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": buildSessionCookieHeader(jwt),
    },
  });
}
