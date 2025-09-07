const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const RegistrationsSchema = new Schema({
  createAt: { type: Date, default: Date.now },
  previousBalance: {type: Number, required: true},
  newBalance: {type: Number, required: true},
  type: { type: String, required: true },
  value: { type: Number, required: true },
  category: { type: String, required: true },
  description: { type: String },
  tags: [{type: String}],
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
