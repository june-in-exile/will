// 共用常數
export const NETWORKS = {
  ETHEREUM: 1,
  SEPOLIA: 11155111,
  POLYGON: 137,
} as const;

export const CONTRACT_ADDRESSES = {
  [NETWORKS.ETHEREUM]: {
    TESTAMENT_FACTORY: "0x...",
  },
  [NETWORKS.SEPOLIA]: {
    TESTAMENT_FACTORY: "0x...",
  },
} as const;

export type NetworkId = keyof typeof NETWORKS;
