import { Router } from "express";
import { DeploymentController } from "../controllers/DeploymentController";

const deploymentRoutes = Router();
const deploymentController = new DeploymentController();

deploymentRoutes.post("/", deploymentController.create);
deploymentRoutes.get("/", deploymentController.list);

export { deploymentRoutes };
