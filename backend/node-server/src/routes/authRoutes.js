const express = require("express");
const {
  register,
  login,
  currentUser,
  logout
} = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.get("/me", authMiddleware, currentUser);

module.exports = router;
