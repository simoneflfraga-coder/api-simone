const mongoose = require("mongoose");

const CustomersSchema = require("./Models/Customers");
const ProductsSchema = require("./Models/Products");
const OrdersSchema = require("./Models/Orders");
const RegistrationsSchema = require("./Models/Registrations");
// const RegistrationSchema = require("./Models/Registrations");
const FinancialsSchema = require("./Models/Financials");
const UserSchema = require("./Models/Users");

let customersConnection;
let productsConnection;
let ordersConnection;
let registrationsConnection;
let financialsConnection;
let usersConnection;

// ---------------------------------------------------------------------------------------------

const connection = mongoose.createConnection(
  "mongodb+srv://dataramosdb:data13542@cluster0.pwsrbdd.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
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

usersConnection = connection.model("Users", UserSchema, "Users");

// ---------------------------------------------------------------------------------------------

module.exports = {
  customersConnection,
  productsConnection,
  ordersConnection,
  registrationsConnection,
  financialsConnection,
  usersConnection,
};
