import { Response } from "express";
import { Prisma } from "@prisma/client";
import prisma from "../config/prisma";
import { AuthenticatedRequest } from "../middleware/auth.middleware";

type TransactionClient = Prisma.TransactionClient;

const generateOrderNumber = async (
  tx: TransactionClient
): Promise<string> => {
  const year = new Date().getFullYear();

  const lastOrder = await tx.salesOrder.findFirst({
    where: {
      orderNumber: {
        startsWith: `SO-${year}-`,
      },
    },
    orderBy: {
      id: "desc",
    },
  });

  const nextNumber = lastOrder
    ? Number(lastOrder.orderNumber.split("-")[2]) + 1
    : 1;

  return `SO-${year}-${String(nextNumber).padStart(5, "0")}`;
};

export const convertQuotationToSalesOrder = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const quotationId = Number(req.params.id);

    if (!Number.isInteger(quotationId) || quotationId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid quotation ID",
      });
    }

    const salesOrder = await prisma.$transaction(
      async (tx) => {
        const quotation = await tx.quotation.findUnique({
          where: {
            id: quotationId,
          },
          include: {
            customer: true,
            enquiry: true,
            items: true,
            salesOrder: true,
          },
        });

        if (!quotation) {
          throw new Error("QUOTATION_NOT_FOUND");
        }

        if (quotation.status !== "ACCEPTED") {
          throw new Error("QUOTATION_NOT_ACCEPTED");
        }

        if (quotation.salesOrder) {
          throw new Error("SALES_ORDER_ALREADY_EXISTS");
        }

        const orderNumber = await generateOrderNumber(tx);

        const order = await tx.salesOrder.create({
          data: {
            orderNumber,
            customerId: quotation.customerId,
            quotationId: quotation.id,
            orderDate: new Date(),
            totalAmount: quotation.grandTotal,
            status: "PENDING",

            items: {
              create: quotation.items.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                lineAmount: item.lineAmount,
              })),
            },
          },

          include: {
            customer: true,

            quotation: {
              include: {
                enquiry: true,
              },
            },

            items: {
              include: {
                product: true,
              },
            },
          },
        });

        return order;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      }
    );

    return res.status(201).json({
      success: true,
      message: "Sales Order created successfully",
      data: salesOrder,
    });
  } catch (error) {
    console.error("Convert quotation error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "";

    if (
      error instanceof Prisma.PrismaClientKnownRequestError
    ) {
      if (error.code === "P2002") {
        return res.status(409).json({
          success: false,
          message:
            "A Sales Order already exists for this quotation or order number conflict occurred",
        });
      }

      if (error.code === "P2034") {
        return res.status(409).json({
          success: false,
          message:
            "Concurrent Sales Order conversion detected. Please retry",
        });
      }
    }

    if (errorMessage === "QUOTATION_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Quotation not found",
      });
    }

    if (errorMessage === "QUOTATION_NOT_ACCEPTED") {
      return res.status(400).json({
        success: false,
        message:
          "Only an ACCEPTED quotation can be converted into a Sales Order",
      });
    }

    if (errorMessage === "SALES_ORDER_ALREADY_EXISTS") {
      return res.status(409).json({
        success: false,
        message:
          "A Sales Order already exists for this quotation",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to convert quotation into Sales Order",
    });
  }
};

export const getSalesOrders = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const salesOrders = await prisma.salesOrder.findMany({
      include: {
        customer: true,

        quotation: {
          include: {
            enquiry: {
              select: {
                id: true,
                enquiryNumber: true,
                status: true,
              },
            },
          },
        },

        items: {
          include: {
            product: true,
          },
        },

        dispatch: {
          select: {
            id: true,
            dispatchNumber: true,
            dispatchDate: true,
          },
        },
      },

      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json({
      success: true,
      data: salesOrders,
    });
  } catch (error) {
    console.error("Get sales orders error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch Sales Orders",
    });
  }
};

export const confirmSalesOrder = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const salesOrderId = Number(req.params.id);

    if (!Number.isInteger(salesOrderId) || salesOrderId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid Sales Order ID",
      });
    }

    const confirmedOrder = await prisma.$transaction(
      async (tx) => {
        const salesOrder = await tx.salesOrder.findUnique({
          where: {
            id: salesOrderId,
          },
          include: {
            items: true,
            customer: true,
            quotation: true,
          },
        });

        if (!salesOrder) {
          throw new Error("SALES_ORDER_NOT_FOUND");
        }

        if (salesOrder.status !== "PENDING") {
          throw new Error("SALES_ORDER_NOT_PENDING");
        }

        for (const item of salesOrder.items) {
          const result = await tx.$executeRaw`
            UPDATE inventory
            SET reserved_quantity = reserved_quantity + ${item.quantity},
                updated_at = NOW()
            WHERE product_id = ${item.productId}
              AND physical_quantity - reserved_quantity >= ${item.quantity}
          `;

          if (result !== 1) {
            throw new Error(
              `INSUFFICIENT_STOCK:${item.productId}`
            );
          }
        }

        const updatedOrder = await tx.salesOrder.update({
          where: {
            id: salesOrderId,
          },
          data: {
            status: "CONFIRMED",
            confirmedAt: new Date(),
          },
          include: {
            customer: true,
            quotation: {
              include: {
                enquiry: true,
              },
            },
            items: {
              include: {
                product: true,
              },
            },
          },
        });

        return updatedOrder;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      }
    );

    return res.status(200).json({
      success: true,
      message:
        "Sales Order confirmed and inventory reserved successfully",
      data: confirmedOrder,
    });
  } catch (error) {
    console.error("Confirm Sales Order error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "";

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      return res.status(409).json({
        success: false,
        message:
          "Concurrent inventory operation detected. Please retry",
      });
    }

    if (errorMessage === "SALES_ORDER_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Sales Order not found",
      });
    }

    if (errorMessage === "SALES_ORDER_NOT_PENDING") {
      return res.status(400).json({
        success: false,
        message:
          "Only a PENDING Sales Order can be confirmed",
      });
    }

    if (errorMessage.startsWith("INSUFFICIENT_STOCK:")) {
      const productId = errorMessage.split(":")[1];

      return res.status(409).json({
        success: false,
        message:
          `Insufficient available inventory for product ID ${productId}`,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to confirm Sales Order",
    });
  }
};

export const dispatchSalesOrder = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const salesOrderId = Number(req.params.id);

    if (!Number.isInteger(salesOrderId) || salesOrderId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid Sales Order ID",
      });
    }

    const { vehicleNumber, driverName, items } = req.body;

    const dispatch = await prisma.$transaction(
      async (tx) => {
        const salesOrder = await tx.salesOrder.findUnique({
          where: {
            id: salesOrderId,
          },
          include: {
            items: true,
            dispatch: true,
          },
        });

        if (!salesOrder) {
          throw new Error("SALES_ORDER_NOT_FOUND");
        }

        if (salesOrder.status === "CANCELLED") {
          throw new Error("SALES_ORDER_CANCELLED");
        }

        if (salesOrder.status !== "CONFIRMED") {
          throw new Error("SALES_ORDER_NOT_CONFIRMED");
        }

        if (salesOrder.dispatch) {
          throw new Error("DISPATCH_ALREADY_EXISTS");
        }

        if (!Array.isArray(items) || items.length === 0) {
          throw new Error("INVALID_DISPATCH_ITEMS");
        }

        const orderItemMap = new Map(
          salesOrder.items.map((item) => [
            item.productId,
            item,
          ])
        );

        const dispatchProductIds = new Set<number>();

        for (const item of items) {
          if (
            !Number.isInteger(item.productId) ||
            !Number.isInteger(item.quantity) ||
            item.quantity <= 0
          ) {
            throw new Error("INVALID_DISPATCH_ITEMS");
          }

          if (dispatchProductIds.has(item.productId)) {
            throw new Error("DUPLICATE_DISPATCH_PRODUCT");
          }

          dispatchProductIds.add(item.productId);

          const orderItem = orderItemMap.get(item.productId);

          if (!orderItem) {
            throw new Error("PRODUCT_NOT_IN_ORDER");
          }

          if (item.quantity !== orderItem.quantity) {
            throw new Error(
              `INVALID_DISPATCH_QUANTITY:${item.productId}`
            );
          }
        }

        if (items.length !== salesOrder.items.length) {
          throw new Error("ALL_ORDER_ITEMS_REQUIRED");
        }

        const year = new Date().getFullYear();

        const lastDispatch = await tx.dispatch.findFirst({
          where: {
            dispatchNumber: {
              startsWith: `DSP-${year}-`,
            },
          },
          orderBy: {
            id: "desc",
          },
        });

        const nextNumber = lastDispatch
          ? Number(
              lastDispatch.dispatchNumber.split("-")[2]
            ) + 1
          : 1;

        const dispatchNumber = `DSP-${year}-${String(
          nextNumber
        ).padStart(5, "0")}`;

        for (const item of items) {
          const result = await tx.$executeRaw`
            UPDATE inventory
            SET physical_quantity = physical_quantity - ${item.quantity},
                reserved_quantity = reserved_quantity - ${item.quantity},
                updated_at = NOW()
            WHERE product_id = ${item.productId}
              AND reserved_quantity >= ${item.quantity}
              AND physical_quantity >= ${item.quantity}
          `;

          if (result !== 1) {
            throw new Error(
              `INSUFFICIENT_RESERVED_STOCK:${item.productId}`
            );
          }
        }

        const createdDispatch = await tx.dispatch.create({
          data: {
            dispatchNumber,
            salesOrderId,
            dispatchDate: new Date(),
            vehicleNumber,
            driverName,

            items: {
              create: items.map(
                (item: {
                  productId: number;
                  quantity: number;
                }) => ({
                  productId: item.productId,
                  quantity: item.quantity,
                })
              ),
            },
          },

          include: {
            salesOrder: {
              include: {
                customer: true,
                quotation: {
                  include: {
                    enquiry: true,
                  },
                },
              },
            },

            items: {
              include: {
                product: true,
              },
            },
          },
        });

        await tx.salesOrder.update({
          where: {
            id: salesOrderId,
          },
          data: {
            status: "DISPATCHED",
            dispatchedAt: new Date(),
          },
        });

        return createdDispatch;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      }
    );

    return res.status(201).json({
      success: true,
      message: "Sales Order dispatched successfully",
      data: dispatch,
    });
  } catch (error) {
    console.error("Dispatch Sales Order error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "";

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      return res.status(409).json({
        success: false,
        message:
          "Concurrent inventory operation detected. Please retry",
      });
    }

    if (errorMessage === "SALES_ORDER_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Sales Order not found",
      });
    }

    if (errorMessage === "SALES_ORDER_CANCELLED") {
      return res.status(400).json({
        success: false,
        message: "Cancelled Sales Order cannot be dispatched",
      });
    }

    if (errorMessage === "SALES_ORDER_NOT_CONFIRMED") {
      return res.status(400).json({
        success: false,
        message:
          "Only a CONFIRMED Sales Order can be dispatched",
      });
    }

    if (errorMessage === "DISPATCH_ALREADY_EXISTS") {
      return res.status(409).json({
        success: false,
        message:
          "A dispatch already exists for this Sales Order",
      });
    }

    if (
      errorMessage === "INVALID_DISPATCH_ITEMS" ||
      errorMessage === "DUPLICATE_DISPATCH_PRODUCT" ||
      errorMessage === "PRODUCT_NOT_IN_ORDER" ||
      errorMessage === "ALL_ORDER_ITEMS_REQUIRED"
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid dispatch items",
      });
    }

    if (
      errorMessage.startsWith("INVALID_DISPATCH_QUANTITY:")
    ) {
      const productId = errorMessage.split(":")[1];

      return res.status(400).json({
        success: false,
        message:
          `Dispatch quantity must match Sales Order quantity for product ID ${productId}`,
      });
    }

    if (
      errorMessage.startsWith("INSUFFICIENT_RESERVED_STOCK:")
    ) {
      const productId = errorMessage.split(":")[1];

      return res.status(409).json({
        success: false,
        message:
          `Insufficient reserved inventory for product ID ${productId}`,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to dispatch Sales Order",
    });
  }
};

export const cancelSalesOrder = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const salesOrderId = Number(req.params.id);

    if (!Number.isInteger(salesOrderId) || salesOrderId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid Sales Order ID",
      });
    }

    const result = await prisma.$transaction(
      async (tx) => {
        const lockedOrder = await tx.$queryRaw<
          Array<{
            id: number;
            status: string;
          }>
        >`
          SELECT id, status
          FROM sales_orders
          WHERE id = ${salesOrderId}
          FOR UPDATE
        `;

        if (lockedOrder.length === 0) {
          throw new Error("SALES_ORDER_NOT_FOUND");
        }

        if (lockedOrder[0].status !== "CONFIRMED") {
          throw new Error(
            "ONLY_CONFIRMED_ORDER_CAN_BE_CANCELLED"
          );
        }

        const orderItems = await tx.salesOrderItem.findMany({
          where: {
            salesOrderId,
          },
        });

        for (const item of orderItems) {
          const updated = await tx.$executeRaw`
            UPDATE inventory
            SET reserved_quantity =
                  reserved_quantity - ${item.quantity},
                updated_at = NOW()
            WHERE product_id = ${item.productId}
              AND reserved_quantity >= ${item.quantity}
          `;

          if (updated !== 1) {
            throw new Error(
              `INVALID_RESERVED_QUANTITY:${item.productId}`
            );
          }
        }

        const salesOrder = await tx.salesOrder.update({
          where: {
            id: salesOrderId,
          },
          data: {
            status: "CANCELLED",
            cancelledAt: new Date(),
          },
          include: {
            customer: true,

            quotation: {
              include: {
                enquiry: true,
              },
            },

            items: {
              include: {
                product: true,
              },
            },
          },
        });

        return salesOrder;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      }
    );

    return res.status(200).json({
      success: true,
      message: "Sales Order cancelled successfully",
      data: result,
    });
  } catch (error) {
    console.error("Cancel Sales Order error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "";

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      return res.status(409).json({
        success: false,
        message:
          "Concurrent inventory operation detected. Please retry",
      });
    }

    if (errorMessage === "SALES_ORDER_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Sales Order not found",
      });
    }

    if (
      errorMessage === "ONLY_CONFIRMED_ORDER_CAN_BE_CANCELLED"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Only a CONFIRMED Sales Order can be cancelled",
      });
    }

    if (
      errorMessage.startsWith("INVALID_RESERVED_QUANTITY:")
    ) {
      const productId = errorMessage.split(":")[1];

      return res.status(409).json({
        success: false,
        message:
          `Invalid reserved inventory for product ID ${productId}`,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to cancel Sales Order",
    });
  }
};