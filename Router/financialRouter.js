const express = require("express");
const connection = require("../Database/connection");

const Router = express.Router();

// BUSCAR TODOS
Router.get("/", async (req, res) => {
  try {
    const financials = await connection.financialsConnection.find({});
    res.json(financials);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar os dados financeiros" });
  }
});

// BUSCAR POR ID
Router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const financial = await connection.financialsConnection.findById(id);
    res.json(financial);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar dado financeiro por ID" });
  }
});

// CRIAR
Router.post("/create", async (req, res) => {
  try {
    const { current, moneyOut, cashInflow, pendentIn } = req.body;

    const newFinancial = await connection.financialsConnection.create({
      current,
      moneyOut,
      cashInflow,
      pendentIn,
    });

    res.status(201).json(newFinancial);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao criar dado financeiro" });
  }
});

// DELETAR
Router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await connection.financialsConnection.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ error: "Dado financeiro não encontrado" });
    }

    res.json({ message: "Dado financeiro deletado com sucesso" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao deletar dado financeiro" });
  }
});

module.exports = Router;
