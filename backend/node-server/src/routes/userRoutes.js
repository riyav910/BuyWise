const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { getProfile } = require("../controllers/userController");
const {
  getUserOrders,
  createOrder,
  deleteOrder,
  removeOrderItem
} = require("../controllers/orderController");

const router = express.Router();

// User profile
router.get("/profile", authMiddleware, getProfile);

// Order history endpoints
router.get("/orders", authMiddleware, getUserOrders);
router.post("/orders", authMiddleware, createOrder);
router.delete("/orders/:id", authMiddleware, deleteOrder);
router.delete("/orders/:orderId/items/:itemId", authMiddleware, removeOrderItem);

module.exports = router;
