const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  platform: { type: String, required: true }, // e.g. 'blinkit', 'zepto', 'bigbasket', 'jiomart'
  price: { type: Number, required: true },
  quantity: { type: Number, default: 1 },
  packageDisplay: { type: String },
  productUrl: { type: String }
});

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    items: [orderItemSchema],
    platformsUsed: [{ type: String }],
    itemsSubtotal: { type: Number, required: true },
    deliveryTotal: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    savingsAmount: { type: Number, default: 0 },
    orderMode: {
      type: String,
      enum: ["single_store", "split_store"],
      default: "single_store"
    },
    status: {
      type: String,
      enum: ["placed", "completed", "cancelled"],
      default: "completed"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
