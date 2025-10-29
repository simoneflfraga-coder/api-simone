// Router/authRouter.js
const express = require("express");
const jwt = require("jsonwebtoken");
const argon2 = require("argon2");
require("dotenv").config();

const connection = require("../Database/connection"); // seu módulo de conexão
const Router = express.Router();

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
const ACCESS_TOKEN_EXPIRES = process.env.ACCESS_TOKEN_EXPIRES || "15m";
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;
const REFRESH_TOKEN_EXPIRES = process.env.REFRESH_TOKEN_EXPIRES || "1d";
const NODE_ENV_PRODUCTION = process.env.NODE_ENV_PRODUCTION === "true";

if (!ACCESS_TOKEN_SECRET || !REFRESH_TOKEN_SECRET) {
  console.error("⚠️  Faltando secrets no .env");
}

Router.post("/", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "Email e senha são obrigatórios" });

    const user = await connection.usersConnection?.findOne({ email });
    if (!user) return res.status(401).json({ error: "Credenciais inválidas" });

    // Supondo que você guardou senha como hash (user.passwordHash)
    // const hash = user.password; // adapte ao seu campo
    // const valid = await argon2.verify(hash, password);
    const valid = user.password === password;
    if (!valid) return res.status(401).json({ error: "Credenciais inválidas" });

    // Cria payload minimalista (não coloque informações sensíveis)
    const payload = {
      sub: user._id.toString(),
      email: user.email,
      roles: user.roles || [],
    };

    // Gera Access Token
    const accessToken = jwt.sign(payload, ACCESS_TOKEN_SECRET, {
      expiresIn: ACCESS_TOKEN_EXPIRES,
    });

    // Gera Refresh Token
    const refreshToken = jwt.sign(payload, REFRESH_TOKEN_SECRET, {
      expiresIn: REFRESH_TOKEN_EXPIRES,
    });

    // Envia Refresh Token em cookie HttpOnly
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true, // impede acesso via JS
      secure: NODE_ENV_PRODUCTION, // só HTTPS (em dev pode usar false)
      sameSite: NODE_ENV_PRODUCTION ? "None" : "Lax",
      maxAge: 24 * 60 * 60 * 1000, // 1 dia
      path: "/", // cookie enviado em todas as rotas do domínio
    });

    console.log("Token Criado");
    return res.json({ accessToken });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro no login" });
  }
});

// ---------------------------- REFRESH TOKEN ---------------------------- //
Router.post("/refresh", async (req, res) => {
  try {
    const token = req.cookies.refreshToken;
    if (!token)
      return res.status(401).json({ error: "Token de atualização ausente" });

    // Verifica validade do refresh token
    jwt.verify(token, REFRESH_TOKEN_SECRET, (err, decoded) => {
      if (err)
        return res
          .status(403)
          .json({ error: "Refresh token inválido ou expirado" });

      const payload = {
        sub: decoded.sub,
        email: decoded.email,
        roles: decoded.roles,
      };

      // Gera novo Access Token
      const accessToken = jwt.sign(payload, ACCESS_TOKEN_SECRET, {
        expiresIn: ACCESS_TOKEN_EXPIRES,
      });

      // (opcional) Rotacionar refresh token futuramente
      console.log("Token Refresheado");
      return res.json({ accessToken });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao renovar token" });
  }
});

// ---------------------------- LOGOUT ---------------------------- //
Router.post("/logout", (req, res) => {
  res.clearCookie("refreshToken", {
    httpOnly: true,
    sameSite: NODE_ENV_PRODUCTION ? "None" : "Lax",
    secure: NODE_ENV_PRODUCTION, // só HTTPS (em dev pode usar false)
    path: "/", // cookie enviado em todas as rotas do domínio
  });
  res.json({ message: "Logout realizado com sucesso" });
});

module.exports = Router;
