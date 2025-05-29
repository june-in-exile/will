export interface Testament {
  id: string;
  owner: string;
  beneficiaries: string[];
  content: string;
  encrypted: boolean;
  timestamp: number;
}

export * from './crypto';