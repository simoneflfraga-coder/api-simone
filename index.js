const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
require("dotenv").config();

const customersRouter = require("./Router/customersRouter");
const productsRouter = require("./Router/productsRouter");
const orderRouter = require("./Router/orderRouter");
const registrationRouter = require("./Router/registrationRouter");
const financialRouter = require("./Router/financialRouter");
const publicRouter = require("./Router/publicRouter");
const authRouter = require("./Router/authRouter");

require("./Database/connection");

const ensureAuth = require("./middleware/auth"); // middleware criado

const app = express();
const port = process.env.PORT || 1354;

const corsOptions = {
  origin: process.env.FRONTEND_URL || "https://app-sistema.vercel.app",
  credentials: true,
};

app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rota pública para autenticação
app.use("/auth", authRouter);
app.use("/public", publicRouter);


// A partir daqui, todas as rotas usam ensureAuth
app.use(ensureAuth);

// rotas protegidas
app.use("/customer", customersRouter);
app.use("/product", productsRouter);
app.use("/order", orderRouter);
app.use("/registration", registrationRouter);
app.use("/financial", financialRouter);

app.listen(port, () => {
  console.log("Servidor Iniciado na porta " + port);
});



