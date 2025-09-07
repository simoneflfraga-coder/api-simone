const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const FinancialsSchema = new Schema({
    current: { type: Number, default: 0 },
    moneyOut: { type: Number, default: 0 },
    cashInflow: { type: Number, default: 0 },
    pendentIn: { type : Number, default: 0},
    // pendentOut: { type: Number, default: 0 },
})

module.exports = FinancialsSchema;