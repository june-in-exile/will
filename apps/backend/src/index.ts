import express from "express";
import cors from "cors";
// import type { Will } from '@shared/types/index.js';

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Will backend is running",
  });
});

// app.get('/api/wills', (req, res) => {
//   const mockWill: Will = {
//     id: '1',
//     owner: '0x1234567890123456789012345678901234567890',
//     beneficiaries: ['0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'],
//     content: 'Test will content',
//     encrypted: false,
//     timestamp: Date.now()
//   };

//   res.json([mockWill]);
// });

app.listen(port, () => {
  console.log(`🚀 Backend server running on port ${port}`);
});
