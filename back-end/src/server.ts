import "dotenv/config";
import express, { type Request, type Response } from "express";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

app.get("/", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    message: "API funcionando!",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
  });
});

// Rotas não encontradas
app.use((_req: Request, res: Response) => {
  res.status(404).json({ status: "error", message: "Rota não encontrada" });
});

app.listen(PORT, () => {
  console.log(`API rodando na porta ${PORT}`);
});
