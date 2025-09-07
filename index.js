const express = require('express');
const cors = require("cors");
// const mainRouter = require('./Router/mainRouter');
const customersRouter = require('./Router/customersRouter');
const productsRouter = require('./Router/productsRouter');
const orderRouter = require('./Router/orderRouter');
const registrationRouter = require('./Router/registrationRouter');
const financialRouter = require('./Router/financialRouter');

require('./Database/connection');

const app = express();
const port = process.env.PORT || 1354;

app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/customer', customersRouter);
app.use('/product',  productsRouter);
app.use('/order',  orderRouter);
app.use('/registration', registrationRouter);
app.use('/financial', financialRouter);

app.listen(port, () => {
    console.log('Servidor Iniciado na porta ' + port);
});
