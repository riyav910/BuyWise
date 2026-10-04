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
  res.cookie("buywise_token", token, {
    httpOnly: true,
    secure: nodeEnv === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
}

module.exports = {
  createToken,
  setAuthCookie
};
