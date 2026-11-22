const axios = require("axios");
const FormData = require("form-data");
const { pythonBackendUrl } = require("../config/env");

async function compareProducts(items, requiredQuantity, requiredUnit, pincode, latitude, longitude) {
  const response = await axios.post(
    `${pythonBackendUrl}/compare`,
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
}

async function parseImage(file) {
  const form = new FormData();
  form.append("file", file.buffer, {
    filename: file.originalname,
    contentType: file.mimetype
  });

  const response = await axios.post(
    `${pythonBackendUrl}/parse-image`,
    form,
    {
      headers: form.getHeaders(),
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      timeout: 120000
    }
  );

  return response.data;
}

module.exports = {
  compareProducts,
  parseImage
};
