import { Request, Response } from "express";
import { prisma } from "../prisma";

export class DeploymentController {
  async create(req: Request, res: Response) {
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
  }

  async list(req: Request, res: Response) {
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
  }
}
