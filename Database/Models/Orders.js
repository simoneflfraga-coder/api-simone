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

    // agora: valor já pago pelo cliente (em centavos) — agora será mantido como soma de paymentHistory
    installmentsPaid: { type: Number, default: 0, min: 0 },
    // agora: quanto ainda falta pagar (em centavos)
    paid: { type: Number, default: 0, min: 0 },

    // Histórico de pagamento dos clientes
    paymentHistory: [
      {
        date: { type: Date, default: Date.now },
        value: { type: Number, default: 1, min: 1 },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Helper: soma os valores do paymentHistory
function sumPaymentHistoryArray(arr) {
  if (!Array.isArray(arr)) return 0;
  return arr.reduce((s, p) => s + (p && p.value ? Number(p.value) : 0), 0);
}

// Antes de salvar: recalcula installmentsPaid a partir de paymentHistory e recalcula paid
OrdersSchema.pre("save", function (next) {
  // installmentsPaid sempre será a soma do paymentHistory
  this.installmentsPaid = sumPaymentHistoryArray(this.paymentHistory || []);
  // paid = preço total - já pago
  this.paid = Math.max(
    0,
    (this.price || this.totalAmount || 0) - (this.installmentsPaid || 0)
  );
  next();
});

// Antes de atualizar via findOneAndUpdate / updateOne: convertemos mudanças em paymentHistory em installmentsPaid + paid
async function updatePaidInUpdate(next) {
  const update = this.getUpdate() || {};
  const query = this.getQuery();
  const Model = this.model;

  // Pega documento atual (precisamos dele para simular alterações)
  const doc = await Model.findOne(query).lean();
  const currentArray = doc && Array.isArray(doc.paymentHistory) ? doc.paymentHistory.slice() : [];

  // util helpers
  const toStringId = (v) => (v && v._id ? String(v._id) : String(v || ""));

  // Função para somar array de paymentHistory
  const sumPaymentHistoryArray = (arr) => {
    if (!Array.isArray(arr)) return 0;
    return arr.reduce((s, p) => s + (p && p.value ? Number(p.value) : 0), 0);
  };

  // Helper para decidir se um elemento corresponde aos critérios de $pull
  function matchesCriteria(elem, crit) {
    if (!crit || typeof crit !== "object") return false;
    // itera chaves do critério
    for (const key of Object.keys(crit)) {
      const cond = crit[key];

      // se cond é operador (ex: { _id: { $in: [...] } })
      if (cond && typeof cond === "object" && Object.keys(cond).some((k) => k.startsWith("$"))) {
        // suportar alguns operadores comuns: $in, $eq, $lt, $lte, $gt, $gte
        if (cond.$in) {
          const vals = cond.$in.map((v) => String(v));
          if (!vals.includes(String(elem[key] ?? elem[key]?._id ?? ""))) return false;
          continue;
        }
        if (cond.$eq !== undefined) {
          if (String(elem[key] ?? elem[key]?._id ?? "") !== String(cond.$eq)) return false;
          continue;
        }
        if (cond.$lt !== undefined) {
          if (!(Number(elem[key]) < Number(cond.$lt))) return false;
          continue;
        }
        if (cond.$lte !== undefined) {
          if (!(Number(elem[key]) <= Number(cond.$lte))) return false;
          continue;
        }
        if (cond.$gt !== undefined) {
          if (!(Number(elem[key]) > Number(cond.$gt))) return false;
          continue;
        }
        if (cond.$gte !== undefined) {
          if (!(Number(elem[key]) >= Number(cond.$gte))) return false;
          continue;
        }
        // se operador não suportado, não remove por segurança
        return false;
      }

      // caso normal - comparação por _id especial ou igualdade direta
      if (key === "_id" || key === "id") {
        if (String(elem._id) !== String(cond)) return false;
        continue;
      }

      // se cond é object (ex.: { date: { $gte: ... } }) já tratado acima
      if (typeof cond === "object") {
        // tentativa simples: comparar stringify
        if (String(elem[key] ?? "") !== String(cond)) return false;
      } else {
        if (String(elem[key] ?? "") !== String(cond)) return false;
      }
    }
    return true;
  }

  // COMEÇA a simulação do novo array:
  let simulated = currentArray.slice();

  // 1) Se o update possui override direto: $set.paymentHistory ou paymentHistory (top-level)
  if (update.$set && update.$set.paymentHistory !== undefined) {
    simulated = Array.isArray(update.$set.paymentHistory)
      ? update.$set.paymentHistory.slice()
      : simulated;
  } else if (update.paymentHistory !== undefined) {
    simulated = Array.isArray(update.paymentHistory) ? update.paymentHistory.slice() : simulated;
  } else {
    // 2) Aplicar $pull primeiro (baseado no array atual)
    if (update.$pull && update.$pull.paymentHistory) {
      const crit = update.$pull.paymentHistory;
      simulated = simulated.filter((elem) => !matchesCriteria(elem, crit));
    }

    // 3) Aplicar $addToSet (se houver)
    if (update.$addToSet && update.$addToSet.paymentHistory) {
      const toAdd = update.$addToSet.paymentHistory;
      // se é $each dentro de addToSet, top-level could be array; handle both
      const items = Array.isArray(toAdd.$each ? toAdd.$each : toAdd) ? (toAdd.$each || toAdd) : [toAdd];
      for (const item of items) {
        // add only if not exists by _id or deep equality on value+date
        const exists = simulated.some((s) =>
          (s._id && item._id && String(s._id) === String(item._id)) ||
          (s.date && item.date && String(new Date(s.date).toISOString()) === String(new Date(item.date).toISOString()) && Number(s.value) === Number(item.value))
        );
        if (!exists) simulated.push(item);
      }
    }

    // 4) Aplicar $push (append). Suporta $each
    if (update.$push && update.$push.paymentHistory) {
      const ph = update.$push.paymentHistory;
      if (ph && ph.$each && Array.isArray(ph.$each)) {
        for (const it of ph.$each) simulated.push(it);
      } else {
        simulated.push(ph);
      }
    }
  }

  // Agora simulated representa o array depois das operações aplicadas.
  const newInstallmentsPaid = sumPaymentHistoryArray(simulated || []);

  // Decide o preço (leva em conta price / totalAmount e $inc)
  let price = null;
  if (update.price != null) price = update.price;
  else if (update.$set && update.$set.price != null) price = update.$set.price;
  else if (update.totalAmount != null) price = update.totalAmount;
  else if (update.$set && update.$set.totalAmount != null) price = update.$set.totalAmount;
  else if (doc) {
    price = doc.price ?? doc.totalAmount ?? 0;
    if (update.$inc) {
      if (update.$inc.price != null) price = (price || 0) + Number(update.$inc.price);
      if (update.$inc.totalAmount != null) price = (price || 0) + Number(update.$inc.totalAmount);
    }
  } else {
    price = 0;
  }

  const remaining = Math.max(0, (price || 0) - (newInstallmentsPaid || 0));

  // Mescla no update garantindo não sobrescrever operadores existentes
  const newUpdate = { ...update };
  newUpdate.$set = {
    ...(newUpdate.$set || {}),
    installmentsPaid: newInstallmentsPaid,
    paid: remaining,
  };

  // garantir que se houve override em paymentHistory já está respeitado (newUpdate.$set.paymentHistory)
  // Se houve $pull/$push, não substituímos paymentHistory no update (mantemos operadores)
  // Mas já garantimos installmentsPaid/paid consistentes.

  this.setUpdate(newUpdate);
  next();
}

OrdersSchema.pre("findOneAndUpdate", updatePaidInUpdate);
OrdersSchema.pre("updateOne", updatePaidInUpdate);

module.exports = OrdersSchema;
