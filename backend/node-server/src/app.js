const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { frontendUrl, nodeEnv } = require("./config/env");
const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productRoutes");
const userRoutes = require("./routes/userRoutes");

const app = express();

app.use(
	cors({
		origin: frontendUrl,
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
	console.error(error);
	const status = error.status === 400 || error.response?.status === 400
		? 400
		: error.status === 404 || error.response?.status === 404
			? 404
			: 500;
	const message = status === 400
		? "Invalid request"
		: status === 404
			? "Requested resource was not found"
			: "Internal server error";

	res.status(status).json({
		success: false,
		message,
		...(nodeEnv !== "production" && error.code ? { code: error.code } : {})
	});
});

module.exports = app;
