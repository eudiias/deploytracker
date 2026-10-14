import client from "prom-client";
import type { Request, Response, NextFunction } from "express";

// 1. Criar Registry centralizado
export const register = new client.Registry();

// 2. Coletar métricas padrão do Node.js (event loop, heap, CPU, etc.)
client.collectDefaultMetrics({
  register,
  prefix: "deploytracker_",
});

// 3. Histograma de latência HTTP (tempo em segundos)
export const httpRequestDurationSeconds = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "Duração das requisições HTTP em segundos",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register],
});

// 4. Contador de requisições HTTP (para throughput e disponibilidade)
export const httpRequestsTotal = new client.Counter({
  name: "http_requests_total",
  help: "Total de requisições HTTP processadas",
  labelNames: ["method", "route", "status_code"],
  registers: [register],
});

// 5. Middleware Express para medir tempo e status
export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Ignora o próprio endpoint de métricas para não distorcer estatísticas
  if (req.path === "/metrics") {
    next();
    return;
  }

  const start = process.hrtime();

  res.on("finish", () => {
    const diff = process.hrtime(start);
    const durationSeconds = (diff[0] ?? 0) + (diff[1] ?? 0) / 1e9;

    // Normaliza a rota para evitar alta cardinalidade
    const route = req.baseUrl || req.path || "unknown";
    const method = req.method;
    const statusCode = res.statusCode.toString();

    httpRequestDurationSeconds.labels(method, route, statusCode).observe(durationSeconds);
    httpRequestsTotal.labels(method, route, statusCode).inc();
  });

  next();
}

