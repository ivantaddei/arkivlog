"use client";

import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { SiweMessage } from "siwe";
import { useAccount, useConnect, useDisconnect, useSignMessage } from "wagmi";
import { braga } from "@arkiv-network/sdk/chains";

interface Me {
  address: `0x${string}` | null;
}

interface SessionValue {
  me: Me;
  loading: boolean;
  refresh: () => Promise<void>;
}

async function fetchMe(): Promise<Me> {
  const res = await fetch("/api/auth/me", { credentials: "include" });
  if (!res.ok) return { address: null };
  return (await res.json()) as Me;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me>({ address: null });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const m = await fetchMe();
      setMe(m);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ me, loading, refresh }),
    [me, loading, refresh],
  );

  return createElement(SessionContext.Provider, { value }, children);
}

export function useMe(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useMe must be used within <SessionProvider>");
  }
  return ctx;
}

export function useSiwe() {
  const { address, isConnected } = useAccount();
  const { connectAsync, connectors, isPending: connectPending } = useConnect();
  const { disconnectAsync } = useDisconnect();
  const { signMessageAsync } = useSignMessage();
  const { me, loading: meLoading, refresh } = useMe();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signIn = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      let activeAddress = address;
      if (!isConnected || !activeAddress) {
        const injected = connectors[0];
        if (!injected) throw new Error("No wallet connector available");
        const result = await connectAsync({ connector: injected });
        activeAddress = result.accounts[0];
      }
      if (!activeAddress) throw new Error("No wallet address");

      const nonceRes = await fetch(
        `/api/auth/nonce?address=${activeAddress}`,
      );
      if (!nonceRes.ok) {
        throw new Error(`Failed to fetch nonce (${nonceRes.status})`);
      }
      const { nonce } = (await nonceRes.json()) as { nonce: string };

      const message = new SiweMessage({
        domain: window.location.host,
        address: activeAddress,
        statement: "Sign in to ArkivLog to view your inmutable audit trail.",
        uri: window.location.origin,
        version: "1",
        chainId: braga.id,
        nonce,
        issuedAt: new Date().toISOString(),
      }).prepareMessage();

      const signature = await signMessageAsync({ message });

      const verifyRes = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message, signature }),
      });
      if (!verifyRes.ok) {
        const body = await verifyRes.json().catch(() => ({}));
        throw new Error(body.error ?? `Verify failed (${verifyRes.status})`);
      }
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [
    address,
    isConnected,
    connectors,
    connectAsync,
    signMessageAsync,
    refresh,
  ]);

  const signOut = useCallback(async () => {
    setBusy(true);
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      await disconnectAsync().catch(() => {});
      await refresh();
    } finally {
      setBusy(false);
    }
  }, [disconnectAsync, refresh]);

  return {
    me,
    meLoading,
    isConnected,
    address,
    signIn,
    signOut,
    busy: busy || connectPending,
    error,
  };
}
