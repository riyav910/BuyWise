const mongoose = require("mongoose");

const CacheWarmTargetSchema = new mongoose.Schema(
  {
    canonical_product_id: {
      type: String,
      required: true,
      ref: "ProductCatalog",
      index: true
    },
    variant_ids: [{ type: String }],
    search_term: {
      type: String,
      required: true,
      index: true
    },
    priority: {
      type: Number,
      default: 1,
      index: true
    }, // 1 = High Velocity (120s refresh), 2 = Moderate (300s refresh)
    search_frequency: {
      type: Number,
      default: 0
    },
    enabled: {
      type: Boolean,
      default: true,
      index: true
    },
    last_warmed_at: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

CacheWarmTargetSchema.index({ enabled: 1, priority: 1 });

module.exports = mongoose.model("CacheWarmTarget", CacheWarmTargetSchema, "cache_warm_targets");
