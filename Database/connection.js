const mongoose = require("mongoose");

const CustomersSchema = require("./Models/Customers");
const ProductsSchema = require("./Models/Products");
const OrdersSchema = require("./Models/Orders");
const RegistrationsSchema = require("./Models/Registrations");
// const RegistrationSchema = require("./Models/Registrations");
const FinancialsSchema = require("./Models/Financials");

let customersConnection;
let productsConnection;
let ordersConnection;
let registrationsConnection;
let financialsConnection;

// ---------------------------------------------------------------------------------------------

const connection = mongoose.createConnection(
  "mongodb+srv://dataramosdb:data13542@cluster.7geoxzu.mongodb.net/data?retryWrites=true&w=majority&appName=Cluster"
);

connection.on("error", (err) => {
  console.log("Erro ao se conectar no DB" + err);
});

connection.on("open", () => {
  console.log("Conexão estabelecida com o DB");
});

// ---------------------------------------------------------------------------------------------

customersConnection = connection.model(
  "Customers",
  CustomersSchema,
  "Customers"
);

productsConnection = connection.model("Products", ProductsSchema, "Products");

ordersConnection = connection.model("Orders", OrdersSchema, "Orders");

registrationsConnection = connection.model(
  "Registrations",
  RegistrationsSchema,
  "Registrations"
);

financialsConnection = connection.model(
  "Finalcials",
  FinancialsSchema,
  "Financials"
);

// ---------------------------------------------------------------------------------------------

module.exports = {
  customersConnection,
  productsConnection,
  ordersConnection,
  registrationsConnection,
  financialsConnection,
};
