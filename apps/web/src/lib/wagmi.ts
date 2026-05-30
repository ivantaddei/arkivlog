import { braga } from "@arkiv-network/sdk/chains";
import { http, createConfig } from "wagmi";
import { injected } from "wagmi/connectors";

/**
 * Wagmi config — single chain (Arkiv Braga testnet), MetaMask only.
 * We intentionally skip WalletConnect to avoid needing a projectId for the demo.
 */
export const wagmiConfig = createConfig({
  chains: [braga],
  connectors: [injected({ shimDisconnect: true })],
  transports: {
    [braga.id]: http(),
  },
  ssr: true,
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
