const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { frontendUrl, nodeEnv } = require("./config/env");
const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productRoutes");
const userRoutes = require("./routes/userRoutes");

const app = express();

const allowedOrigins = (frontendUrl || "*").split(",").map((o) => o.trim()).filter(Boolean);

app.use(
	cors({
		origin: function (origin, callback) {
			if (!origin) return callback(null, true);
			if (
				allowedOrigins.includes("*") ||
				allowedOrigins.includes(origin) ||
				origin.endsWith(".netlify.app") ||
				origin.includes("localhost") ||
				origin.includes("127.0.0.1")
			) {
				return callback(null, true);
			}
			return callback(null, true);
		},
		credentials: true
	})
);

app.use(express.json());
app.use(cookieParser());

app.get("/api/health", (req, res) => {
	res.json({
		success: true,
		message: "Node backend is running"
	});
});

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/user", userRoutes);

app.use((error, req, res, next) => {
	console.error("Server Error:", error.message || error);
	const status = error.status === 400 || error.response?.status === 400
		? 400
		: error.status === 404 || error.response?.status === 404
			? 404
			: error.status || 500;

	res.status(status).json({
		success: false,
		message: error.message || "Internal server error",
		...(error.details ? { details: error.details } : {})
	});
});

module.exports = app;
