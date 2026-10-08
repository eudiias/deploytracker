import { Router } from "express";
import { WebhookController } from "../controllers/WebhookController";

const webhookRoutes = Router();
const webhookController = new WebhookController();

// A rota ficará disponível em POST /webhooks/github
webhookRoutes.post("/github", webhookController.githubPush);

export { webhookRoutes };
