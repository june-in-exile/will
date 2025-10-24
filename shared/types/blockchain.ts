type EthereumAddress = `0x${string}`;
interface Estate {
  beneficiary: string;
  token: string;
  amount: bigint;
}

interface EstateToken {
  address: string;
  estates: number[];
  totalAmount: bigint;
}

interface WillContractInfo {
  testator: string;
  executor: string;
  estates: Estate[];
}

interface TokenBalance {
  address: string;
  tokenAddress: string;
  balance: bigint;
  formattedBalance: string;
  symbol: string;
  decimals: number;
}

interface BalanceSnapshot {
  timestamp: number;
  balances: TokenBalance[];
}

interface Permit2Signature {
  nonce: bigint;
  deadline: number;
  signature: string;
}

export type {
  EthereumAddress,
  Estate,
  EstateToken,
  WillContractInfo,
  TokenBalance,
  BalanceSnapshot,
  Permit2Signature,
};
