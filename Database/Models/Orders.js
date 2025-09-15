const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const OrdersSchema = new Schema(
  {
    date: { type: Date, default: Date.now },

    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },

    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        amount: { type: Number, required: true, min: 1 },
        unitPrice: { type: Number, required: true, min: 0 },
      },
    ],

    totalAmount: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },

    // agora: dia do mês que vence a parcela (1..31)
    installmentsTotal: { type: Number, required: true, min: 1, max: 31 },

    // agora: valor já pago pelo cliente (em centavos)
    installmentsPaid: { type: Number, default: 0, min: 0 },

    // agora: quanto ainda falta pagar (em centavos)
    paid: { type: Number, default: 0, min: 0 },
  },
  {
    timestamps: true,
  }
);

// Atualiza automaticamente o campo `paid` antes de salvar
OrdersSchema.pre("save", function (next) {
  // paid agora representa o valor que falta pagar
  this.paid = Math.max(0, (this.price || this.totalAmount || 0) - (this.installmentsPaid || 0));
  next();
});

// Atualiza automaticamente o campo `paid` quando usar findOneAndUpdate ou updateOne
async function updatePaidInUpdate(next) {
  const update = this.getUpdate() || {};
  const query = this.getQuery();

  // Pega valores já no update
  let installmentsPaid =
    update.installmentsPaid ??
    update.$set?.installmentsPaid;
  let price =
    update.price ??
    update.$set?.price ??
    update.totalAmount ??
    update.$set?.totalAmount;

  // Se não veio no update, buscar do banco
  if (installmentsPaid == null || price == null) {
    const doc = await this.model.findOne(query).lean();
    if (doc) {
      if (installmentsPaid == null) installmentsPaid = doc.installmentsPaid;
      if (price == null) price = doc.price || doc.totalAmount;
    }
  }

  // Calcula valor que falta pagar
  const remaining = Math.max(0, (price || 0) - (installmentsPaid || 0));

  // Mescla no update
  const newUpdate = {
    ...update,
    paid: remaining,
  };

  this.setUpdate(newUpdate);
  next();
}

OrdersSchema.pre("findOneAndUpdate", updatePaidInUpdate);
OrdersSchema.pre("updateOne", updatePaidInUpdate);

module.exports = OrdersSchema;
