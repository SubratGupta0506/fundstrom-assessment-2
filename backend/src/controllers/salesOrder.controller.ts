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