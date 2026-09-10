require("dotenv").config();

const requiredVariables = [
	"MONGO_URI",
	"JWT_SECRET",
	"PYTHON_BACKEND_URL"
];

for (const variable of requiredVariables) {
	if (!process.env[variable]) {
		throw new Error(`Missing environment variable: ${variable}`);
	}
}

module.exports = {
	nodeEnv: process.env.NODE_ENV || "development",
	port: Number(process.env.PORT || 5000),
	mongoUri: process.env.MONGO_URI,
	jwtSecret: process.env.JWT_SECRET,
	pythonBackendUrl: process.env.PYTHON_BACKEND_URL,
	frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000"
};
