const express = require("express");
const connection = require("../Database/connection");
const Router = express.Router();

//BUSCAR TODOS
Router.get("/", async (req, res) => {
  const products = await connection.productsConnection.find({});
  res.json(products);
});

//BUSCAR POR ID
Router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const products = await connection.productsConnection.findById(id);
    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar cliente" });
  }
});

//CRIAR
Router.post("/create", async (req, res) => {
  try {
    const { name, stock, category, value, price, datePurchase, code } =
      req.body;

    const newProduct = await connection.productsConnection.create({
      name,
      stock,
      category,
      value,
      price,
      datePurchase,
      code,
    });

    res.status(201).json(newProduct);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao criar produto" });
  }
});

//DELETAR
Router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const deleteProduct = await connection.productsConnection.findByIdAndDelete(
      id
    );

    if (!deleteProduct) {
      return res.status(404).json({ error: "Produto não encontrado" });
    }

    res.json({ message: "Produto deletado com sucesso" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao deletar o produto" });
  }
});

Router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, stock, category, value, price, datePurchase, code } = req.body;

    const updatedProduct = await connection.productsConnection.findByIdAndUpdate(
      id,
      { name, stock, category, value, price, datePurchase, code },
      { new: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({ error: "Produto não encontrado" });
    }

    res.json(updatedProduct);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao atualizar o produto" });
  }
});

module.exports = Router;
