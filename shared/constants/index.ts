export const NETWORKS = {
  ETHEREUM: 1,
  SEPOLIA: 11155111,
  POLYGON: 137,
  ARB_SEPOLIA: 421614,
  ANVIL: 31337
} as const;

export type NetworkId = keyof typeof NETWORKS;

export * from './crypto';
