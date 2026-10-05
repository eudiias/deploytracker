require("dotenv").config();

const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "API funcionando!",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
  });
});

// Rotas não encontradas
app.use((req, res) => {
  res.status(404).json({ status: "error", message: "Rota não encontrada" });
});

app.listen(PORT, () => {
  console.log(`API rodando na porta ${PORT}`);
});
