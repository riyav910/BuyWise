const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { optimizeCart } = require("../controllers/cartController");

const router = express.Router();

router.post("/optimize", authMiddleware, optimizeCart);

module.exports = router;
