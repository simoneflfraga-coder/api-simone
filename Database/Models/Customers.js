const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const CustomersSchema = new Schema({
  name: { type: String, required: true },
  telephone: { type: String, required: true },
  // cpf: { type: String, required: false, unique: true },
  cpf: { type: String, required: false, sparse: true },
  address: { type: String },
  anniversary: { type: Date },
});

module.exports = CustomersSchema;
