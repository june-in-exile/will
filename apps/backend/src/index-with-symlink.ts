import express from "express";
import cors from "cors";
// 使用符號連結的方式

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

app.listen(port, () => {
  console.log(`🚀 Backend server running on port ${port}`);
});
