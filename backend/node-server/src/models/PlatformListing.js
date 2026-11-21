const mongoose = require("mongoose");

const PlatformListingSchema = new mongoose.Schema(
  {
    canonical_product_id: {
      type: String,
      required: true,
      ref: "ProductCatalog",
      index: true
    },
    variant_id: {
      type: String,
      required: true,
      index: true
    },
    platform: {
      type: String,
      enum: ["blinkit", "zepto", "bigbasket", "jiomart"],
      required: true,
      index: true
    },
    platform_product_id: {
      type: String,
      required: true
    },
    platform_product_name: {
      type: String,
      required: true
    },
    product_url: {
      type: String
    },
    match_confidence: {
      type: Number,
      default: 1.0
    },
    is_active: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

PlatformListingSchema.index({ variant_id: 1, platform: 1 });
PlatformListingSchema.index({ platform: 1, platform_product_id: 1 });

module.exports = mongoose.model("PlatformListing", PlatformListingSchema, "platform_listings");
