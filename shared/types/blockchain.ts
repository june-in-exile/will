type EthereumAddress = `0x${string}`;
interface Estate {
  beneficiary: string;
  token: string;
  amount: bigint;
}

// interface WillData {
//   testator: string;
//   estates: Estate[];
//   will: EthereumAddress;
// }

/**
 * Will information interface
 */
interface WillInfo {
  testator: string;
  executor: string;
  executed: boolean;
  estates: Estate[];
}

/**
 * Token balance information
 */
interface TokenBalance {
  address: string;
  tokenAddress: string;
  balance: bigint;
  formattedBalance: string;
  symbol: string;
  decimals: number;
}

/**
 * Balance snapshot for tracking changes
 */
interface BalanceSnapshot {
  timestamp: number;
  balances: TokenBalance[];
}

interface Permit2Signature {
  nonce: number;
  deadline: number;
  signature: string;
}

export type {
  EthereumAddress,
  Estate,
  WillData,
  WillInfo,
  TokenBalance,
  BalanceSnapshot,
  Permit2Signature,
};
