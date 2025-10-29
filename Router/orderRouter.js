const express = require("express");
const connection = require("../Database/connection");
const Router = express.Router();
const mongoose = require("mongoose");

//-----------------------------------------------------------------------------------------

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

      const product = await productsConnection
        .findById(productId)
        .session(session);
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

/**
 * NOVA ROTA: Adicionar pagamento ao pedido
 * POST /order/:id/payment
 * Body esperado: { date?: string, value: number }  -> value em CENTAVOS (inteiro)
 *
 * Usa findByIdAndUpdate com $push para operação atômica.
 * O middleware pre('findOneAndUpdate') do schema irá recalcular installmentsPaid e paid.
 */
// POST /order/:id/payment  --- transacional: atualiza order, financials e registrations atomically
// POST /order/:id/payment
Router.post("/:id/payment", async (req, res) => {
  const session = await connection.ordersConnection.startSession();
  try {
    session.startTransaction();

    const { id } = req.params;
    const { date, value, nameCustomer } = req.body;

    if (value == null) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: "Campo 'value' é obrigatório (em centavos)." });
    }

    const numericValue = Number(value);
    if (!Number.isInteger(numericValue) || numericValue <= 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: "Campo 'value' inválido. Deve ser inteiro > 0 (centavos)." });
    }

    const payment = {
      date: date ? new Date(date) : new Date(),
      value: numericValue,
    };

    // 1) Buscar pedido dentro da sessão
    const order = await connection.ordersConnection.findById(id).session(session);
    if (!order) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ error: "Pedido não encontrado" });
    }

    // 2) Adicionar pagamento no array e salvar (dispara pre('save') do schema)
    order.paymentHistory.push(payment);
    await order.save({ session, runValidators: true });

    // Pega o payment recém-criado (agora tem _id)
    const savedPayment = order.paymentHistory[order.paymentHistory.length - 1];
    const paymentId = savedPayment && savedPayment._id ? String(savedPayment._id) : null;

    // 3) Atualizar Financials (documento singleton) dentro da mesma sessão
    let financials = await connection.financialsConnection.findOne({}).session(session);
    if (!financials) {
      const created = await connection.financialsConnection.create([{}], { session });
      financials = created[0];
    }

    const previousBalance = Number(financials.current || 0);
    financials.cashInflow = (financials.cashInflow || 0) + numericValue;
    financials.current = previousBalance + numericValue;
    await financials.save({ session });

    // 4) Criar registro na collection registrations com category "venda"
    // Agora salvamos paymentId e orderId para ligação direta
    const registration = {
      previousBalance: previousBalance,
      newBalance: financials.current,
      type: "In",
      value: numericValue,
      category: "venda",
      paymentId: paymentId,          // <-- link direto
      orderId: String(order._id),    // <-- opcional: bom para auditoria
      description: `Pagamento do pedido ${nameCustomer || String(order._id)}`,
      createAt: new Date(),
    };

    // console.log(paymentId);
    // console.log(order._id);

    await connection.registrationsConnection.create([registration], { session });

    // 5) Commit
    await session.commitTransaction();
    session.endSession();

    const updatedOrder = await connection.ordersConnection.findById(id);
    return res.json({ order: updatedOrder });
  } catch (err) {
    console.error("Erro em /:id/payment transacional:", err);
    try { await session.abortTransaction(); } catch (e) { console.error("Erro abortTransaction:", e); }
    session.endSession();
    return res.status(500).json({ error: err.message || "Erro ao processar pagamento" });
  }
});


/**
 * REMOVER pagamento do pedido
 * DELETE /order/:id/payment/:paymentId
 * Remove o subdocumento de paymentHistory cujo _id seja paymentId.
 */
// DELETE /order/:id/payment/:paymentId  --- transacional: apaga payment, registration e ajusta financials
Router.delete("/:id/payment/:paymentId", async (req, res) => {
  const session = await connection.ordersConnection.startSession();
  try {
    session.startTransaction();

    const { id, paymentId } = req.params;

    // validação simples dos ids
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(paymentId)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: "orderId ou paymentId inválido" });
    }

    // 1) Buscar pedido com sessão (precisamos do pagamento para saber o valor)
    const order = await connection.ordersConnection.findById(id).session(session);
    if (!order) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ error: "Pedido não encontrado" });
    }

    // 2) Encontrar o pagamento dentro do pedido
    // usa subdocument id() helper do mongoose
    const payment = order.paymentHistory.id(paymentId);
    if (!payment) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ error: "Pagamento não encontrado no pedido" });
    }

    const paymentValue = Number(payment.value || 0);

    // 3) Remover o pagamento do pedido ($pull) dentro da sessão
    const updatedOrder = await connection.ordersConnection.findByIdAndUpdate(
      id,
      { $pull: { paymentHistory: { _id: paymentId } } },
      { new: true, runValidators: true, session }
    );

    if (!updatedOrder) {
      await session.abortTransaction();
      session.endSession();
      return res.status(500).json({ error: "Falha ao atualizar o pedido" });
    }

    // 4) Deletar o registro vinculado (se existir) dentro da sessão
    // usa orderId + paymentId (garanta que o campo no schema se chama paymentId)
    try {
      await connection.registrationsConnection.findOneAndDelete(
        { orderId: id, paymentId: paymentId },
        { session }
      );
      // não abortamos se não existir; apenas tentamos deletar (não é erro se não encontra)
    } catch (regErr) {
      // erro real ao acessar a collection -> abort
      console.error("Erro ao deletar registration:", regErr);
      await session.abortTransaction();
      session.endSession();
      return res.status(500).json({ error: "Erro ao deletar registro financeiro" });
    }

    // 5) Atualizar financials (subtrair cashInflow e current)
    // Usa upsert:true para criar se não existir (opcional — ajuste se preferir abortar)
    try {
      const updatedFinancials = await connection.financialsConnection.findOneAndUpdate(
        {},
        { $inc: { cashInflow: -paymentValue, current: -paymentValue } },
        { new: true, upsert: false, session }
      );

      if (!updatedFinancials) {
        // se por algum motivo não retornou documento, aborta
        await session.abortTransaction();
        session.endSession();
        return res.status(500).json({ error: "Falha ao atualizar financials" });
      }
    } catch (finErr) {
      console.error("Erro ao atualizar financials:", finErr);
      await session.abortTransaction();
      session.endSession();
      return res.status(500).json({ error: "Erro ao atualizar financeiro" });
    }

    // 6) Commit
    await session.commitTransaction();
    session.endSession();

    // Retornar pedido atualizado (recarregado sem sessão)
    const finalOrder = await connection.ordersConnection.findById(id);
    return res.json({ order: finalOrder });
  } catch (err) {
    console.error("Erro em DELETE /:id/payment/:paymentId transacional:", err);
    try {
      await session.abortTransaction();
    } catch (e) {
      console.error("Erro abortTransaction:", e);
    }
    session.endSession();
    return res.status(500).json({ error: err.message || "Erro ao remover pagamento" });
  }
});


module.exports = Router;
