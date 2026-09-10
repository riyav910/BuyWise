const { parseImage } = require("../services/pythonService");

async function uploadAndParseImage(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "An image file is required"
      });
    }

    const result = await parseImage(req.file);

    return res.json({
      success: true,
      ...result
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  uploadAndParseImage
};