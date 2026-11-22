const { compareProducts } = require("../services/pythonService");
const ProductCatalog = require("../models/ProductCatalog");
const PlatformListing = require("../models/PlatformListing");

async function compare(req, res, next) {
  try {
    const {
      items,
      required_quantity: requiredQuantity,
      required_unit: requiredUnit,
      pincode,
      latitude,
      longitude
    } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one product is required"
      });
    }

    const result = await compareProducts(
      items,
      requiredQuantity,
      requiredUnit,
      pincode,
      latitude,
      longitude
    );

    if (result.error || result.message) {
      return res.status(404).json({
        success: false,
        message: result.error || result.message
      });
    }

    return res.json({
      success: true,
      data: result
    });
  } catch (error) {
    return next(error);
  }
}

async function getCatalog(req, res, next) {
  try {
    const { q, category, brand, tier } = req.query;
    const filter = {};
    if (category) filter.category = category.toLowerCase().trim();
    if (brand) filter.brand = new RegExp(`^${brand.trim()}$`, "i");
    if (tier) filter.velocity_tier = tier.trim();
    if (q) {
      const trimmed = q.trim();
      filter.$or = [
        { brand: new RegExp(trimmed, "i") },
        { generic_name: new RegExp(trimmed, "i") },
        { product_name: new RegExp(trimmed, "i") },
        { search_keywords: new RegExp(trimmed, "i") }
      ];
    }
    const products = await ProductCatalog.find(filter).lean();
    return res.json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (error) {
    return next(error);
  }
}

async function getCatalogProduct(req, res, next) {
  try {
    const { id } = req.params;
    const product = await ProductCatalog.findById(id).lean();
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Canonical product not found"
      });
    }
    const listings = await PlatformListing.find({
      canonical_product_id: id,
      is_active: true
    }).lean();

    return res.json({
      success: true,
      data: {
        ...product,
        listings
      }
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  compare,
  getCatalog,
  getCatalogProduct
};
