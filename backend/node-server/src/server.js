const app = require("./app");
const connectDatabase = require("./config/db");
const { port } = require("./config/env");

async function startServer() {
	try {
		await connectDatabase();

		app.listen(port, () => {
			console.log(`Node backend running at http://127.0.0.1:${port}`);
		});
	} catch (error) {
		console.error("Server startup failed:", error.message);
		process.exit(1);
	}
}

startServer();
