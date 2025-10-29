// middleware/auth.js
const jwt = require("jsonwebtoken");
require("dotenv").config();

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
if (!ACCESS_TOKEN_SECRET) {
  console.error("⚠️  ACCESS_TOKEN_SECRET não definido no .env");
}

module.exports = function ensureAuth(req, res, next) {
  // Pegar o Authorization header (Bearer token)
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Token não fornecido" });
  }

  const parts = authHeader.split(" ");
  if (parts.length !== 2) {
    return res.status(401).json({ error: "Formato do token inválido" });
  }

  const [scheme, token] = parts;
  if (!/^Bearer$/i.test(scheme)) {
    return res.status(401).json({ error: "Formato do token inválido" });
  }

  jwt.verify(token, ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      // Pode ser token expirado ou inválido
      return res.status(401).json({ error: "Token inválido ou expirado" });
    }
    // Coloca dados do usuário na req para as rotas usarem
    req.userId = decoded.sub || decoded.id;
    req.user = decoded; // contém payload completo se precisar (ex: roles, email)
    return next(); // <--- apenas pra deixar o fluxo explícito
  });
};
