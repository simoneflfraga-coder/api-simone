const express = require("express");

const connection = require("../Database/connection");

const Router = express.Router();

//BUSCAR TODOS
Router.get("/", async (req, res) => {
  const orders = await connection.ordersConnection.find({});
  res.json(orders);
});

//BUSCAR POR ID
Router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const order = await connection.ordersConnection.findById(id);
    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Pedido não encontrado" });
  }
});

//CRIAR
Router.post("/create", async (req, res) => {
  const session = await connection.ordersConnection.startSession();
  session.startTransaction();

  try {
    const {
      customerId,
      items,
      totalAmount,
      price,
      installmentsTotal,
      installmentsPaid,
      paid,
    } = req.body;

    // Validar e atualizar o estoque
    const { productsConnection } = require("../Database/connection");

    for (const item of items) {
      const { productId, amount } = item;

      const product = await productsConnection.findById(productId).session(session);
      if (!product) {
        throw new Error(`Produto com ID ${productId} não encontrado.`);
      }

      if (product.stock < amount) {
        throw new Error(
          `Estoque insuficiente para o produto ${product.name}. Disponível: ${product.stock}, solicitado: ${amount}`
        );
      }

      product.stock -= amount;
      await product.save({ session });
    }

    // Criar o pedido
    const newOrder = await connection.ordersConnection.create(
      [
        {
          customerId,
          items,
          totalAmount,
          price,
          installmentsTotal,
          installmentsPaid,
          paid,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    res.status(201).json(newOrder[0]);
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error(err);
    res.status(400).json({ error: err.message || "Erro ao criar pedido" });
  }
});

//DELETAR
Router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deleteOrder = await connection.ordersConnection.findByIdAndDelete(id);

    if (!deleteOrder) {
      return res.status(404).json({ error: "Pedido não encontrado" });
    }

    res.json({ message: "Pedido deletado com sucesso" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao deletar o pedido" });
  }
});

Router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const updatedOrder = await connection.ordersConnection.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    if (!updatedOrder) {
      return res.status(404).json({ error: "Pedido não encontrado" });
    }

    res.json(updatedOrder);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao atualizar o pedido" });
  }
});

module.exports = Router;
