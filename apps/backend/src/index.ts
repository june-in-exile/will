import express from 'express';
import cors from 'cors';
// 使用相對路徑引用，避免 path mapping 問題
import { formatAddress } from '../../../shared/utils/index.js';
import { NETWORKS } from '../../../shared/constants/index.js';
import type { Testament } from '../../../shared/types/index.js';

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    message: 'Testament backend is running',
    networks: NETWORKS,
    testAddress: formatAddress('0x1234567890123456789012345678901234567890')
  });
});

app.get('/api/testaments', (req, res) => {
  const mockTestament: Testament = {
    id: '1',
    owner: '0x1234567890123456789012345678901234567890',
    beneficiaries: ['0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'],
    content: 'Test testament content',
    encrypted: false,
    timestamp: Date.now()
  };
  
  res.json([mockTestament]);
});

app.listen(port, () => {
  console.log(`🚀 Backend server running on port ${port}`);
});
