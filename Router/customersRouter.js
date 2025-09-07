const express = require("express");

const connection = require("../Database/connection");

const Router = express.Router();


//BUSCAR TODOS
Router.get("/", async (req, res) => {
  const items = await connection.customersConnection.find({});
  res.json(items);
});


//BUSCAR POR ID
Router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await connection.customersConnection.findById(id);
    res.json(customer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar cliente" });
  }
});

//CRIAR
Router.post("/create", async (req, res) => {
  try {
    const { name, telephone, cpf, address, anniversary } = req.body;

    // Verificação básica
    if (!name || !telephone || !cpf) {
      return res.status(400).json({ error: "Campos obrigatórios faltando." });
    }

    const newCustomer = await connection.customersConnection.create({
      name,
      telephone,
      cpf,
      address,
      anniversary,
    });

    res.status(201).json(newCustomer); // Retorna o cliente criado
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao criar cliente" });
  }
});


//DELETAR
Router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deletedCustomer =
      await connection.customersConnection.findByIdAndDelete(id);

    if (!deletedCustomer) {
      return res.status(404).json({ error: "Cliente não encontrado" });
    }

    res.json({ message: "Cliente deletado com sucesso" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao deletar o cliente" });
  }
});

Router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, telephone, cpf, address, anniversary } = req.body;

    // Verificação básica
    if (!name || !telephone || !cpf) {
      return res.status(400).json({ error: "Campos obrigatórios faltando." });
    }

    const updatedCustomer = await connection.customersConnection.findByIdAndUpdate(
      id,
      { name, telephone, cpf, address, anniversary },
      { new: true }
    );

    if (!updatedCustomer) {
      return res.status(404).json({ error: "Cliente não encontrado" });
    }

    res.json(updatedCustomer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao atualizar cliente" });
  }
});

module.exports = Router;
