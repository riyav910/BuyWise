const { compareProducts } = require("../services/pythonService");

async function compare(req, res, next) {
  try {
    const {
      items,
      required_quantity: requiredQuantity,
      required_unit: requiredUnit
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
      requiredUnit
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

module.exports = {
  compare
};
