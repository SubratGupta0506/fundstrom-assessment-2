import request from "supertest";
import app from "../src/app";

describe("SupplyFlow ERP API Integration Tests", () => {
  let adminToken: string;
  let salesToken: string;

  test("Admin login returns JWT token", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({
        email: "admin@supplyflow.com",
        password: "Admin@123",
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.token).toBeDefined();

    adminToken = response.body.data.token;
  });

  test("Sales User login returns JWT token", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({
        email: "sales@supplyflow.com",
        password: "Sales@123",
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.token).toBeDefined();

    salesToken = response.body.data.token;
  });

  test("Sales User cannot confirm a Sales Order", async () => {
    const response = await request(app)
      .post("/api/sales-orders/1/confirm")
      .set("Authorization", `Bearer ${salesToken}`);

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });

  test("Sales User cannot update inventory", async () => {
    const response = await request(app)
      .patch("/api/inventory/1")
      .set("Authorization", `Bearer ${salesToken}`)
      .send({
        physicalQty: 100,
        reservedQty: 20,
      });

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });

  test("Unauthenticated request cannot access inventory", async () => {
    const response = await request(app)
      .get("/api/inventory");

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  test("Admin can access inventory", async () => {
    const response = await request(app)
      .get("/api/inventory")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
  });
});