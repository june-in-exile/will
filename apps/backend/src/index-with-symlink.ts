import express from 'express';
import cors from 'cors';
// 使用符號連結的方式
import { formatAddress } from '../shared/utils/index.js';
import { NETWORKS } from '../shared/constants/index.js';

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

app.listen(port, () => {
  console.log(`🚀 Backend server running on port ${port}`);
});
