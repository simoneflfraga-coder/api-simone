const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ProductsSchema = new Schema({
  name: { type: String, required: true },
  stock: { type: Number, required: true, min: 0 },
  category: { type: String, required: true },
  value: { type: Number, required: true, min: 0 }, // custo de compra (Centavos)
  price: { type: Number, required: true, min: 0 }, // preço de venda (Centavos)
  datePurchase: { type: Date, default: Date.now }, // data da compra ou cadastro
  code: { type: String, unique: true, required: true },
});

module.exports = ProductsSchema;