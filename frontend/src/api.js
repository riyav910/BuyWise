import axios from "axios";

let rawBaseUrl = (process.env.REACT_APP_API_URL || "http://localhost:5000/api").trim().replace(/\/+$/, "");
if (!rawBaseUrl.endsWith("/api")) {
  rawBaseUrl += "/api";
}

const api = axios.create({
  baseURL: rawBaseUrl,
  withCredentials: true
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("buywise_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
