const axios = require("axios");
const FormData = require("form-data");
const { pythonBackendUrl } = require("../config/env");

function getTargetUrl() {
  return (pythonBackendUrl || "http://127.0.0.1:8000").trim().replace(/\/+$/, "");
}

async function compareProducts(items, requiredQuantity, requiredUnit, pincode, latitude, longitude) {
  const target = getTargetUrl();
  try {
    const response = await axios.post(
      `${target}/compare`,
      {
        items,
        required_quantity: requiredQuantity,
        required_unit: requiredUnit,
        pincode: pincode || "560001",
        latitude,
        longitude
      },
      {
        timeout: 120000
      }
    );

    return response.data;
  } catch (error) {
    const errorMsg = error.response?.data?.detail || error.message;
    console.error(`Error reaching Python Scraper Engine at ${target}/compare: ${errorMsg}`);
    const err = new Error(
      `Scraper Engine is unreachable at ${target} (${errorMsg}). Please ensure start_local_backend.bat is running on your PC and PYTHON_BACKEND_URL on Render matches your live tunnel URL.`
    );
    err.status = 502;
    throw err;
  }
}

async function parseImage(file) {
  const target = getTargetUrl();
  const form = new FormData();
  form.append("file", file.buffer, {
    filename: file.originalname,
    contentType: file.mimetype
  });

  try {
    const response = await axios.post(
      `${target}/parse-image`,
      form,
      {
        headers: form.getHeaders(),
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        timeout: 120000
      }
    );

    return response.data;
  } catch (error) {
    const errorMsg = error.response?.data?.detail || error.message;
    console.error(`Error reaching Python OCR Engine at ${target}/parse-image: ${errorMsg}`);
    const err = new Error(`OCR Engine is unreachable at ${target} (${errorMsg}).`);
    err.status = 502;
    throw err;
  }
}

module.exports = {
  compareProducts,
  parseImage
};
