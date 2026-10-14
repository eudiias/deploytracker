import "dotenv/config";
import express, { type Request, type Response } from "express";
import cors from "cors";
import { deploymentRoutes } from "./routes/deployment.routes";
import { webhookRoutes } from "./routes/webhook.routes";
import { metricsMiddleware, register } from "./metrics";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());
app.use(metricsMiddleware);

// Endpoint de Métricas do Prometheus
app.get("/metrics", async (_req: Request, res: Response) => {
  try {
    res.setHeader("Content-Type", register.contentType);
    res.send(await register.metrics());
  } catch (error) {
    res.status(500).send(error);
  }
});

app.get("/", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    message: "API funcionando!",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
  });
});

app.use("/deployments", deploymentRoutes);
app.use("/webhooks", webhookRoutes);

// Rotas não encontradas
app.use((_req: Request, res: Response) => {
  res.status(404).json({ status: "error", message: "Rota não encontrada" });
});

app.listen(PORT, () => {
  console.log(`API rodando na porta ${PORT}`);
});
