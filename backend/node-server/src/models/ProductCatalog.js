const mongoose = require("mongoose");

const VariantSchema = new mongoose.Schema(
  {
    variant_id: { type: String, required: true },
    pack_quantity: { type: String, required: true },
    normalized_quantity: { type: Number, required: true }, // In base unit: ml, g, piece
    dimension: {
      type: String,
      enum: ["volume", "weight", "count", "unit"],
      required: true
    },
    base_unit: {
      type: String,
      enum: ["ml", "g", "piece", "unit"],
      required: true
    },
    is_active: { type: Boolean, default: true }
  },
  { _id: false }
);

const ProductCatalogSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true }, // Stable canonical product ID (e.g., "amul_vanilla_magic")
    category: { type: String, required: true, index: true }, // e.g. "dairy", "bakery", "staples"
    generic_name: { type: String, required: true, index: true }, // e.g. "ice cream", "milk", "bread"
    product_name: { type: String, required: true }, // e.g. "Vanilla Magic", "Taaza Fresh Toned Milk"
    brand: { type: String, required: true, index: true }, // e.g. "Amul", "Mother Dairy", "Britannia"
    attributes: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {}
    },
    search_keywords: [{ type: String }],
    velocity_tier: {
      type: String,
      enum: ["high", "moderate", "occasional"],
      default: "moderate",
      index: true
    },
    refresh_ttl_seconds: { type: Number, default: 300 },
    variants: [VariantSchema]
  },
  {
    timestamps: true
  }
);

ProductCatalogSchema.index({ brand: 1, generic_name: 1 });
ProductCatalogSchema.index({ search_keywords: 1 });

module.exports = mongoose.model("ProductCatalog", ProductCatalogSchema, "product_catalog");
