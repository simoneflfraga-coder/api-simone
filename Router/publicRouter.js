const express = require("express");
const rateLimit = require("express-rate-limit");
const connection = require("../Database/connection");
const mongoose = require("mongoose");
const Router = express.Router();

// rate limiter básico para rotas públicas
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 30, // 30 requisições por IP por minuto (ajuste)
  message: { error: "Muitas requisições. Tente novamente mais tarde." },
});

Router.use(limiter);

function maskTelephone(phone) {
  if (!phone) return "";
  return phone.replace(/\d(?=\d{4})/g, "*");
}

Router.get("/customer/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // valida se o id é um ObjectId válido do MongoDB
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    // busca apenas campos públicos do cliente
    const customer = await connection.customersConnection
      .findById(id, { name: 1, telephone: 1 })
      .lean();

    if (!customer) {
      return res.status(404).json({ error: "Cliente não encontrado" });
    }

    // aplica a máscara no telefone
    const maskedCustomer = {
      name: customer.name,
      telephone: maskTelephone(customer.telephone),
    };

    res.json(maskedCustomer);
  } catch (err) {
    console.error("Erro ao buscar cliente:", err);
    res.status(500).json({ error: "Erro ao buscar cliente" });
  }
});

Router.get("/order/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    // Apenas campos seguros do pedido
    const order = await connection.ordersConnection.findById(id).lean();

    if (!order) return res.status(404).json({ error: "Pedido não encontrado" });

    res.json(order);
  } catch (err) {
    console.error("Erro ao buscar pedido:", err);
    res.status(500).json({ error: "Erro ao buscar pedido" });
  }
});

Router.get("/product", async (req, res) => {
  try {
    const products = await connection.productsConnection
      ?.find({}, { name: 1 })
      .lean();

    if (!products || products.length === 0) {
      return res.status(404).json({ error: "Nenhum produto encontrado" });
    }

    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar produto" });
  }
});

module.exports = Router;
