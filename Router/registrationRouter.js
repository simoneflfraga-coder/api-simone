const express = require("express");

const connection = require("../Database/connection");

const Router = express.Router();

//BUSCAR TODOS
Router.get("/", async (req, res) => {
  const registrations = await connection.registrationsConnection.find({});
  res.json(registrations);
});

//BUSCAR POR ID
Router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const registration = await connection.registrationsConnection.findById(id);
    res.json(registration);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Registro não encontrado" });
  }
});

Router.post("/create", async (req, res) => {
  const session = await connection.registrationsConnection.startSession();
  session.startTransaction();

  try {
    const {
      date,
      type,
      value,
      category,
      description,
      tags,
    } = req.body;

    const { financialsConnection } = require("../Database/connection");

    // 🟡 Busca o saldo atual do documento financeiro
    const financialDoc = await financialsConnection.findOne(
      {},
      { current: 1 },
      { session }
    ) || { current: 0 };

    const previousBalance = financialDoc.current;
    const incValue = type === "Out" ? -value : value;
    const newBalance = previousBalance + incValue;

    // 🟢 Cria o novo registro com os saldos calculados
    const newRegistration = await connection.registrationsConnection.create(
      [
        {
          previousBalance,
          newBalance,
          date,
          type,
          value,
          category,
          description,
          tags,
        },
      ],
      { session }
    );

    // 🟠 Prepara os campos para $inc
    const incFields = { current: incValue };
    if (type === "Out") {
      incFields.moneyOut = value;
    } else {
      incFields.cashInflow = value;
    }

    // 🔵 Atualiza o documento financeiro
    const updatedFinancial = await financialsConnection.findOneAndUpdate(
      {},
      { $inc: incFields },
      { session, new: true, upsert: true }
    );

    await session.commitTransaction();
    session.endSession();

    return res.status(201).json({
      registration: newRegistration[0],
      updatedFinancial,
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error(err);
    return res.status(500).json({ error: "Erro ao criar registro financeiro" });
  }
});


Router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deleteRegistration =
      await connection.registrationsConnection.findByIdAndDelete(id);

    if (!deleteRegistration) {
      return res.status(404).json({ error: "Registro não encontrado" });
    }

    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao deletar Registro" });
  }
});

Router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const updatedRegistration = await connection.registrationsConnection.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    if (!updatedRegistration) {
      return res.status(404).json({ error: "Registro não encontrado" });
    }

    res.json(updatedRegistration);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao atualizar registro" });
  }
});

module.exports = Router;
