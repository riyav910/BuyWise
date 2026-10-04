const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { createToken, setAuthCookie } = require("../utils/jwt");
const { nodeEnv } = require("../config/env");

function publicUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email
  };
}

async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();

    if (!name || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Name must contain at least 2 characters"
      });
    }

    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid email address"
      });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least 6 characters"
      });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email is already registered"
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash
    });

    setAuthCookie(res, createToken(user._id.toString()));

    return res.status(201).json({
      success: true,
      user: publicUser(user)
    });
  } catch (error) {
    return next(error);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user || !(await bcrypt.compare(password || "", user.passwordHash))) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    setAuthCookie(res, createToken(user._id.toString()));

    return res.json({
      success: true,
      user: publicUser(user)
    });
  } catch (error) {
    return next(error);
  }
}

function currentUser(req, res) {
  return res.json({
    success: true,
    user: publicUser(req.user)
  });
}

function logout(req, res) {
  res.clearCookie("buywise_token", {
    httpOnly: true,
    secure: nodeEnv === "production",
    sameSite: "lax"
  });

  return res.json({
    success: true,
    message: "Logged out successfully"
  });
}

module.exports = {
  register,
  login,
  currentUser,
  logout
};
