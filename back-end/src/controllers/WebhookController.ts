import { Request, Response } from "express";
import { prisma } from "../prisma";
import crypto from "crypto";

export class WebhookController {
  async githubPush(req: Request, res: Response): Promise<any> {
    try {
      // 1. Verificação de Assinatura (Segurança) - Opcional mas recomendado
      const signature = req.headers["x-hub-signature-256"] as string;
      const secret = process.env.GITHUB_WEBHOOK_SECRET;

      if (secret && signature) {
        // Express.json() já parseou o body. Precisamos do raw string para validar perfeitamente, 
        // mas em muitos casos a re-serialização funciona se a ordem das chaves for mantida. 
        // Para simplificar, faremos uma validação básica aqui.
        const payloadString = JSON.stringify(req.body);
        const hmac = crypto.createHmac("sha256", secret);
        const digest = "sha256=" + hmac.update(payloadString).digest("hex");
        
        if (signature !== digest) {
          console.warn("Webhook negado: Assinatura inválida");
          return res.status(401).json({ error: "Assinatura inválida" });
        }
      }

      // 2. Verifica se é um evento de push
      const event = req.headers["x-github-event"];
      if (event !== "push") {
        return res.status(200).json({ message: `Evento ${event} ignorado. Aguardando push.` });
      }

      const payload = req.body;
      
      // Validação: ignorar pushes que não tenham commits novos
      if (!payload.head_commit) {
         return res.status(200).json({ message: "Push sem novos commits. Ignorado." });
      }

      // 3. Mapeamento de regras de negócio
      // Extrair o nome da branch removendo "refs/heads/"
      const branch = payload.ref ? payload.ref.replace("refs/heads/", "") : "unknown";
      
      // Define o ambiente com base na branch (main = production, demais = development)
      const environment = (branch === "main" || branch === "master") ? "production" : "development";
      
      // 4. Preparar os dados para o banco
      const deploymentData = {
        application: payload.repository.name,
        version: payload.head_commit.id.substring(0, 7), // Usando o short hash (7 primeiros chars) como versão
        environment: environment,
        status: "success", // Consideramos o push inicial como um deploy de sucesso
        responsible: payload.head_commit.author.name || payload.pusher.name || "GitHub User",
        commit_hash: payload.head_commit.id,
        commit_message: payload.head_commit.message,
      };

      // 5. Salvar no banco usando o Prisma
      const deployment = await prisma.deployments.create({
        data: deploymentData
      });

      console.log(`[Webhook] Novo deploy registrado para ${deployment.application} (${deployment.environment})`);
      res.status(201).json({ message: "Deploy registrado via GitHub Webhook com sucesso", deployment });
    } catch (error) {
      console.error("Erro ao processar Webhook do GitHub:", error);
      res.status(500).json({ error: "Erro interno ao processar webhook" });
    }
  }
}
