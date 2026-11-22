require("dotenv").config();

module.exports = {
	nodeEnv: process.env.NODE_ENV || "development",
	port: Number(process.env.PORT || 5000),
	mongoUri: process.env.MONGO_URI || "mongodb://127.0.0.1:27017/buywise",
	jwtSecret: process.env.JWT_SECRET || "buywise_secret_key_change_in_production",
	pythonBackendUrl: process.env.PYTHON_BACKEND_URL || "http://127.0.0.1:8000",
	frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000"
};
