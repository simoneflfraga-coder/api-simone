const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const RegistrationsSchema = new Schema({
  createAt: { type: Date, default: Date.now },
  previousBalance: { type: Number, required: true },
  newBalance: { type: Number, required: true },
  type: { type: String, required: true },
  value: { type: Number, required: true },
  category: { type: String, required: true },
  description: { type: String },
  tags: [{ type: String }],

  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Order",
    required: false,
  },

  // Novo campo: id do pagamento específico dentro do pedido
  paymentId: {
    type: mongoose.Schema.Types.ObjectId, // referencia ao _id do subdocumento em paymentHistory
    required: false,
  },
});
/*
date
type (Out / In )
value
category (Pagamento, Recebimento, Entrada Estoque / Pagamento, Saida Estoque / Vendas)
description
tags
COLOCADO AUTOMATICAMENTE ---------------------------------------------------------------------
createAt
previousBalance (Saldo antes do registro)
newBalance (Saldo depois do registro)
*/

module.exports = RegistrationsSchema;
