import "dotenv/config";
import express, { type Request, type Response } from "express";
import cors from "cors";
import { prisma } from "./prisma";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());

app.get("/", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    message: "API funcionando!",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
  });
});

// Registrar um novo deploy
app.post("/deployments", async (req: Request, res: Response) => {
  try {
    const { application, version, environment, status, responsible, commit_hash, commit_message, failure_reason, rollback } = req.body;
    
    const deployment = await prisma.deployments.create({
      data: {
        application,
        version,
        environment,
        status,
        responsible,
        commit_hash,
        commit_message,
        failure_reason,
        rollback
      }
    });
    
    res.status(201).json(deployment);
  } catch (error) {
    console.error("Erro ao registrar deploy:", error);
    res.status(500).json({ status: "error", message: "Erro ao registrar deploy" });
  }
});

// Listar histórico de deploys
app.get("/deployments", async (req: Request, res: Response) => {
  try {
    const { application, environment, status } = req.query;
    
    const filter: any = {};
    if (application) filter.application = application as string;
    if (environment) filter.environment = environment as string;
    if (status) filter.status = status as string;
    
    const deployments = await prisma.deployments.findMany({
      where: filter,
      orderBy: { created_at: 'desc' }
    });
    
    res.json(deployments);
  } catch (error) {
    console.error("Erro ao buscar deploys:", error);
    res.status(500).json({ status: "error", message: "Erro ao buscar deploys" });
  }
});

// Rotas não encontradas
app.use((_req: Request, res: Response) => {
  res.status(404).json({ status: "error", message: "Rota não encontrada" });
});

app.listen(PORT, () => {
  console.log(`API rodando na porta ${PORT}`);
});
