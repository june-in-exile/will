export const NETWORKS = {
  ETHEREUM: 1,
  SEPOLIA: 11155111,
  POLYGON: 137,
  ARB_SEPOLIA: 421614,
  ANVIL: 31337,
} as const;

export const CONTRACT_ADDRESSES = {
  [NETWORKS.ETHEREUM]: {
    WILL_FACTORY: "0x...",
  },
  [NETWORKS.SEPOLIA]: {
    WILL_FACTORY: "0x...",
  },
} as const;

export type NetworkId = keyof typeof NETWORKS;

export * from "./crypto";
