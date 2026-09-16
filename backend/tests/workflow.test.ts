import request from "supertest";
import app from "../src/app";
import prisma from "../src/config/prisma";

describe("SupplyFlow ERP - Mandatory Workflow Tests", () => {
  let adminToken: string;

  const enquiryIds: number[] = [];
  const quotationIds: number[] = [];
  const salesOrderIds: number[] = [];
  const customerIds: number[] = [];

  beforeAll(async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({
        email: "admin@supplyflow.com",
        password: "Admin@123",
      });

    expect(response.status).toBe(200);
    adminToken = response.body.data.token;
  });

  async function createTestEnquiry(quantity: number) {
    const unique = `${Date.now()}${Math.floor(Math.random() * 1000)}`;

    const response = await request(app)
      .post("/api/enquiries")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        companyName: `Automated Test Company ${unique}`,
        contactPerson: "Test User",
        mobile: `9${unique.slice(-9)}`,
        email: `test-${unique}@example.com`,
        city: "Bengaluru",
        requiredDate: "2026-12-31",
        notes: "Automated integration test",
        items: [
          {
            productId: 1,
            quantity,
          },
        ],
      });

    expect(response.status).toBe(201);

    const enquiry = response.body.data;

    enquiryIds.push(enquiry.id);
    customerIds.push(enquiry.customer.id);

    return enquiry;
  }

  async function createTestQuotation(
    enquiryId: number,
    quantity: number
  ) {
    const response = await request(app)
      .post("/api/quotations")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        enquiryId,
        validUntil: "2026-12-31",
        discountPercent: 5,
        gstPercent: 18,
        items: [
          {
            productId: 1,
            quantity,
          },
        ],
      });

    expect(response.status).toBe(201);

    const quotation = response.body.data;

    quotationIds.push(quotation.id);

    return quotation;
  }

  test("quotation total is calculated correctly by the backend", async () => {
    const enquiry = await createTestEnquiry(2);

    const quotation = await createTestQuotation(
      enquiry.id,
      2
    );

    expect(quotation.subtotal).toBe("37000");
    expect(quotation.discountAmount).toBe("1850");
    expect(quotation.taxableAmount).toBe("35150");
    expect(quotation.gstAmount).toBe("6327");
    expect(quotation.grandTotal).toBe("41477");
  });

  test("draft and rejected quotations cannot create Sales Orders", async () => {
    const enquiry = await createTestEnquiry(1);

    const quotation = await createTestQuotation(
      enquiry.id,
      1
    );

    const draftResponse = await request(app)
      .post(`/api/quotations/${quotation.id}/convert`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(draftResponse.status).toBe(400);

    const sentResponse = await request(app)
      .patch(`/api/quotations/${quotation.id}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        status: "SENT",
      });

    expect(sentResponse.status).toBe(200);

    const rejectedResponse = await request(app)
      .patch(`/api/quotations/${quotation.id}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        status: "REJECTED",
      });

    expect(rejectedResponse.status).toBe(200);

    const rejectedConvertResponse = await request(app)
      .post(`/api/quotations/${quotation.id}/convert`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(rejectedConvertResponse.status).toBe(400);
  });

  test("same quotation cannot generate duplicate Sales Orders", async () => {
    const enquiry = await createTestEnquiry(1);

    const quotation = await createTestQuotation(
      enquiry.id,
      1
    );

    const sentResponse = await request(app)
      .patch(`/api/quotations/${quotation.id}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        status: "SENT",
      });

    expect(sentResponse.status).toBe(200);

    const acceptedResponse = await request(app)
      .patch(`/api/quotations/${quotation.id}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        status: "ACCEPTED",
      });

    expect(acceptedResponse.status).toBe(200);

    const firstConvert = await request(app)
      .post(`/api/quotations/${quotation.id}/convert`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(firstConvert.status).toBe(201);

    const salesOrder = firstConvert.body.data;

    salesOrderIds.push(salesOrder.id);

    const secondConvert = await request(app)
      .post(`/api/quotations/${quotation.id}/convert`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(secondConvert.status).toBe(409);
  });

  test("cannot reserve more than available inventory", async () => {
    const inventoryBefore = await prisma.inventory.findUnique({
      where: {
        productId: 1,
      },
    });

    expect(inventoryBefore).not.toBeNull();

    const availableBefore =
      inventoryBefore!.physicalQty -
      inventoryBefore!.reservedQty;

    const excessiveQuantity =
      availableBefore + 1;

    const enquiry = await createTestEnquiry(
      excessiveQuantity
    );

    const quotation = await createTestQuotation(
      enquiry.id,
      excessiveQuantity
    );

    const sentResponse = await request(app)
      .patch(`/api/quotations/${quotation.id}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        status: "SENT",
      });

    expect(sentResponse.status).toBe(200);

    const acceptedResponse = await request(app)
      .patch(`/api/quotations/${quotation.id}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        status: "ACCEPTED",
      });

    expect(acceptedResponse.status).toBe(200);

    const convertResponse = await request(app)
      .post(`/api/quotations/${quotation.id}/convert`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(convertResponse.status).toBe(201);

    const salesOrder = convertResponse.body.data;

    salesOrderIds.push(salesOrder.id);

    const confirmResponse = await request(app)
      .post(`/api/sales-orders/${salesOrder.id}/confirm`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(confirmResponse.status).toBe(409);

    const inventoryAfter = await prisma.inventory.findUnique({
      where: {
        productId: 1,
      },
    });

    expect(inventoryAfter).not.toBeNull();

    expect(inventoryAfter!.physicalQty).toBe(
      inventoryBefore!.physicalQty
    );

    expect(inventoryAfter!.reservedQty).toBe(
      inventoryBefore!.reservedQty
    );
  });

  test("Sales User cannot perform Admin-only operation", async () => {
    const salesLogin = await request(app)
      .post("/api/auth/login")
      .send({
        email: "sales@supplyflow.com",
        password: "Sales@123",
      });

    expect(salesLogin.status).toBe(200);

    const salesToken = salesLogin.body.data.token;

    const response = await request(app)
      .post("/api/sales-orders/1/confirm")
      .set("Authorization", `Bearer ${salesToken}`);

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });
test("confirmed Sales Order cancellation releases reserved inventory", async () => {
  const inventoryBefore = await prisma.inventory.findUnique({
    where: {
      productId: 1,
    },
  });

  expect(inventoryBefore).not.toBeNull();

  const enquiry = await createTestEnquiry(2);

  const quotation = await createTestQuotation(
    enquiry.id,
    2
  );

  const sentResponse = await request(app)
    .patch(`/api/quotations/${quotation.id}/status`)
    .set("Authorization", `Bearer ${adminToken}`)
    .send({
      status: "SENT",
    });

  expect(sentResponse.status).toBe(200);

  const acceptedResponse = await request(app)
    .patch(`/api/quotations/${quotation.id}/status`)
    .set("Authorization", `Bearer ${adminToken}`)
    .send({
      status: "ACCEPTED",
    });

  expect(acceptedResponse.status).toBe(200);

  const convertResponse = await request(app)
    .post(`/api/quotations/${quotation.id}/convert`)
    .set("Authorization", `Bearer ${adminToken}`);

  expect(convertResponse.status).toBe(201);

  const salesOrder = convertResponse.body.data;

  salesOrderIds.push(salesOrder.id);

  const confirmResponse = await request(app)
    .post(`/api/sales-orders/${salesOrder.id}/confirm`)
    .set("Authorization", `Bearer ${adminToken}`);

  expect(confirmResponse.status).toBe(200);

  const inventoryAfterConfirm = await prisma.inventory.findUnique({
    where: {
      productId: 1,
    },
  });

  expect(inventoryAfterConfirm).not.toBeNull();

  expect(inventoryAfterConfirm!.reservedQty).toBe(
    inventoryBefore!.reservedQty + 2
  );

  const cancelResponse = await request(app)
    .post(`/api/sales-orders/${salesOrder.id}/cancel`)
    .set("Authorization", `Bearer ${adminToken}`);

  expect(cancelResponse.status).toBe(200);
  expect(cancelResponse.body.success).toBe(true);
  expect(cancelResponse.body.data.status).toBe("CANCELLED");

  const inventoryAfterCancel = await prisma.inventory.findUnique({
    where: {
      productId: 1,
    },
  });

  expect(inventoryAfterCancel).not.toBeNull();

  expect(inventoryAfterCancel!.physicalQty).toBe(
    inventoryBefore!.physicalQty
  );

  expect(inventoryAfterCancel!.reservedQty).toBe(
    inventoryBefore!.reservedQty
  );
});

  afterAll(async () => {
    for (const salesOrderId of salesOrderIds) {
      const dispatches = await prisma.dispatch.findMany({
        where: {
          salesOrderId,
        },
        select: {
          id: true,
        },
      });

      for (const dispatch of dispatches) {
        await prisma.dispatchItem.deleteMany({
          where: {
            dispatchId: dispatch.id,
          },
        });

        await prisma.dispatch.delete({
          where: {
            id: dispatch.id,
          },
        });
      }

      await prisma.salesOrderItem.deleteMany({
        where: {
          salesOrderId,
        },
      });

      await prisma.salesOrder.delete({
        where: {
          id: salesOrderId,
        },
      });
    }

    for (const quotationId of quotationIds) {
      await prisma.quotationItem.deleteMany({
        where: {
          quotationId,
        },
      });

      await prisma.quotation.delete({
        where: {
          id: quotationId,
        },
      });
    }

    for (const enquiryId of enquiryIds) {
      await prisma.enquiryItem.deleteMany({
        where: {
          enquiryId,
        },
      });

      await prisma.enquiry.delete({
        where: {
          id: enquiryId,
        },
      });
    }

    for (const customerId of customerIds) {
      await prisma.customer.delete({
        where: {
          id: customerId,
        },
      });
    }
  });
});