const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../src/app");
const connectDatabase = require("../src/config/db");

test("health endpoint reports a running Node backend", async () => {
  const response = await request(app).get("/api/health");

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    success: true,
    message: "Node backend is running"
  });
});

test("comparison endpoint validates the product list", async () => {
  const response = await request(app)
    .post("/api/products/compare")
    .send({ items: [] });

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
  assert.equal(response.body.message, "At least one product is required");
});

test("profile endpoint rejects unauthenticated requests", async () => {
  const response = await request(app).get("/api/user/profile");

  assert.equal(response.status, 401);
  assert.equal(response.body.success, false);
});

test("current-user endpoint rejects unauthenticated requests", async () => {
  const response = await request(app).get("/api/auth/me");

  assert.equal(response.status, 401);
  assert.equal(response.body.success, false);
});

test("registration rejects invalid email before database access", async () => {
  const response = await request(app)
    .post("/api/auth/register")
    .send({
      name: "Test User",
      email: "not-an-email",
      password: "secret123"
    });

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
  assert.equal(response.body.message, "Enter a valid email address");
});

test("registration rejects weak passwords before database access", async () => {
  const response = await request(app)
    .post("/api/auth/register")
    .send({
      name: "Test User",
      email: "test@example.com",
      password: "short"
    });

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
  assert.equal(response.body.message, "Password must contain at least 6 characters");
});

test("authentication lifecycle supports register, login, me, and logout", async () => {
  await connectDatabase();
  const email = `buywise-test-${Date.now()}@example.com`;
  const agent = request.agent(app);
  const credentials = {
    name: "Lifecycle User",
    email,
    password: "secret123"
  };

  const registered = await agent.post("/api/auth/register").send(credentials);
  assert.equal(registered.status, 201);
  assert.equal(registered.body.success, true);
  assert.equal("passwordHash" in registered.body.user, false);

  const duplicate = await request(app)
    .post("/api/auth/register")
    .send(credentials);
  assert.equal(duplicate.status, 409);

  const wrongLogin = await request(app)
    .post("/api/auth/login")
    .send({ email, password: "wrong-password" });
  assert.equal(wrongLogin.status, 401);

  const loggedIn = await agent
    .post("/api/auth/login")
    .send({ email, password: credentials.password });
  assert.equal(loggedIn.status, 200);

  const currentUser = await agent.get("/api/auth/me");
  assert.equal(currentUser.status, 200);
  assert.equal(currentUser.body.user.email, email);

  const logout = await agent.post("/api/auth/logout");
  assert.equal(logout.status, 200);

  const afterLogout = await agent.get("/api/auth/me");
  assert.equal(afterLogout.status, 401);

  await mongoose.disconnect();
});
