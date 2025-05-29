// 共用類型定義
export interface Testament {
  id: string;
  owner: string;
  beneficiaries: string[];
  content: string;
  encrypted: boolean;
  timestamp: number;
}

export interface CircuitInput {
  [key: string]: any;
}

export interface ContractConfig {
  address: string;
  abi: any[];
}

export interface User {
  address: string;
  name?: string;
}
