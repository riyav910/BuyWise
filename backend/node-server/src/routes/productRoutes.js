const express = require("express");
const multer = require("multer");
const {
  compare,
  getCatalog,
  getCatalogProduct
} = require("../controllers/productController");
const { uploadAndParseImage } = require("../controllers/ocrController");

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

router.post("/compare", compare);
router.post("/search", compare);
router.post("/parse-image", upload.single("file"), uploadAndParseImage);

// Catalog endpoints
router.get("/catalog", getCatalog);
router.get("/catalog/:id", getCatalogProduct);

module.exports = router;
