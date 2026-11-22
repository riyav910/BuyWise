const jwt = require("jsonwebtoken");
const { jwtSecret, nodeEnv } = require("../config/env");

function createToken(userId) {
  return jwt.sign(
    { userId },
    jwtSecret,
    { expiresIn: "7d" }
  );
}

function setAuthCookie(res, token) {
  const isProd = nodeEnv === "production";
  res.cookie("buywise_token", token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
}

module.exports = {
  createToken,
  setAuthCookie
};
