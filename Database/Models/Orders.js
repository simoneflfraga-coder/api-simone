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
    installmentsTotal: { type: Number, required: true, min: 1 }, // ex: 3
    installmentsPaid: { type: Number, default: 0, min: 0 },
    paid: { type: Boolean, default: false },
  },

  {
    timestamps: true, // createdAt e updatedAt automáticos
  }
);

// Atualiza automaticamente o campo `paid` ao salvar ou atualizar

// 1. Ao salvar com .save()
OrdersSchema.pre("save", function (next) {
  this.paid = this.installmentsPaid >= this.installmentsTotal;
  next();
});

// 2. Ao atualizar com findOneAndUpdate ou updateOne
async function setPaidInUpdate(next) {
  const update = this.getUpdate();

  const installmentsPaid =
    update.installmentsPaid ?? update.$set?.installmentsPaid;
  const installmentsTotal =
    update.installmentsTotal ?? update.$set?.installmentsTotal;

  // Se os dois estiverem no update, calcula direto
  if (installmentsPaid != null && installmentsTotal != null) {
    const paid = installmentsPaid >= installmentsTotal;

    this.setUpdate({
      ...update,
      paid,
    });
  } else {
    // Se só veio um dos campos ou nenhum, carrega do banco para comparar
    const doc = await this.model.findOne(this.getQuery());
    if (doc) {
      const paid =
        (installmentsPaid ?? doc.installmentsPaid) >=
        (installmentsTotal ?? doc.installmentsTotal);

      this.setUpdate({
        ...update,
        paid,
      });
    }
  }

  next();
}

OrdersSchema.pre("findOneAndUpdate", setPaidInUpdate);
OrdersSchema.pre("updateOne", setPaidInUpdate);

module.exports = OrdersSchema;
