const Order = require("../models/Order");

// GET /api/user/orders - Retrieve order history for logged-in user
async function getUserOrders(req, res, next) {
  try {
    const orders = await Order.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      count: orders.length,
      orders
    });
  } catch (error) {
    return next(error);
  }
}

// POST /api/user/orders - Save a new order when checking out from cart/optimizer
async function createOrder(req, res, next) {
  try {
    const {
      items,
      platformsUsed,
      itemsSubtotal,
      deliveryTotal,
      totalAmount,
      savingsAmount,
      orderMode
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Order must contain at least one item."
      });
    }

    const order = await Order.create({
      userId: req.user._id,
      items,
      platformsUsed: platformsUsed || [],
      itemsSubtotal: Number(itemsSubtotal || totalAmount),
      deliveryTotal: Number(deliveryTotal || 0),
      totalAmount: Number(totalAmount),
      savingsAmount: Number(savingsAmount || 0),
      orderMode: orderMode || "single_store"
    });

    return res.status(201).json({
      success: true,
      message: "Order saved successfully",
      order
    });
  } catch (error) {
    return next(error);
  }
}

// DELETE /api/user/orders/:id - Remove an entire order from history
async function deleteOrder(req, res, next) {
  try {
    const { id } = req.params;
    const order = await Order.findOneAndDelete({ _id: id, userId: req.user._id });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    return res.json({
      success: true,
      message: "Order removed from history",
      orderId: id
    });
  } catch (error) {
    return next(error);
  }
}

// DELETE /api/user/orders/:orderId/items/:itemId - Remove a specific product from an order
async function removeOrderItem(req, res, next) {
  try {
    const { orderId, itemId } = req.params;
    const order = await Order.findOne({ _id: orderId, userId: req.user._id });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    const initialCount = order.items.length;
    order.items = order.items.filter((item) => item._id && item._id.toString() !== itemId);

    if (order.items.length === initialCount) {
      return res.status(404).json({
        success: false,
        message: "Product not found in this order"
      });
    }

    // If all items were removed, delete the order completely
    if (order.items.length === 0) {
      await Order.findByIdAndDelete(orderId);
      return res.json({
        success: true,
        message: "Last product removed, order deleted from history",
        orderDeleted: true,
        orderId
      });
    }

    // Recalculate subtotal, total, and platforms used
    const newSubtotal = order.items.reduce(
      (sum, item) => sum + (item.price * (item.quantity || 1)),
      0
    );
    order.itemsSubtotal = newSubtotal;
    order.totalAmount = newSubtotal + (order.deliveryTotal || 0);
    order.platformsUsed = [...new Set(order.items.map((i) => i.platform))];

    await order.save();

    return res.json({
      success: true,
      message: "Product removed from order history",
      order
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getUserOrders,
  createOrder,
  deleteOrder,
  removeOrderItem
};
