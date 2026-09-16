import { Response } from "express";
import { Prisma } from "@prisma/client";
import prisma from "../config/prisma";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import {
  CreateQuotationInput,
  UpdateQuotationStatusInput,
} from "../validators/quotation.validator";

type TransactionClient = Prisma.TransactionClient;

const generateQuotationNumber = async (
  tx: TransactionClient
): Promise<string> => {
  const year = new Date().getFullYear();

  const lastQuotation = await tx.quotation.findFirst({
    where: {
      quotationNumber: {
        startsWith: `QUO-${year}-`,
      },
    },
    orderBy: {
      id: "desc",
    },
  });

  const nextNumber = lastQuotation
    ? Number(lastQuotation.quotationNumber.split("-")[2]) + 1
    : 1;

  return `QUO-${year}-${String(nextNumber).padStart(5, "0")}`;
};

const roundMoney = (value: number): number => {
  return Math.round((value + Number.EPSILON) * 100) / 100;
};

export const createQuotation = async (
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

    const data = req.body as CreateQuotationInput;

    if (data.validUntil < new Date()) {
      return res.status(400).json({
        success: false,
        message: "Quotation validity date cannot be in the past",
      });
    }

    const quotation = await prisma.$transaction(async (tx) => {
      const enquiry = await tx.enquiry.findUnique({
        where: {
          id: data.enquiryId,
        },
        include: {
          customer: true,
          items: true,
          quotation: true,
        },
      });

      if (!enquiry) {
        throw new Error("ENQUIRY_NOT_FOUND");
      }

      if (enquiry.quotation) {
        throw new Error("QUOTATION_ALREADY_EXISTS");
      }

      if (enquiry.status !== "NEW") {
        throw new Error("INVALID_ENQUIRY_STATUS");
      }

      const enquiryProductMap = new Map(
        enquiry.items.map((item) => [item.productId, item.quantity])
      );

      const requestedProductIds = data.items.map(
        (item) => item.productId
      );

      if (
        new Set(requestedProductIds).size !==
        requestedProductIds.length
      ) {
        throw new Error("DUPLICATE_PRODUCTS");
      }

      for (const item of data.items) {
        const enquiryQuantity = enquiryProductMap.get(item.productId);

        if (enquiryQuantity === undefined) {
          throw new Error("PRODUCT_NOT_IN_ENQUIRY");
        }

        if (item.quantity !== enquiryQuantity) {
          throw new Error("QUANTITY_MISMATCH");
        }
      }

      if (data.items.length !== enquiry.items.length) {
        throw new Error("ENQUIRY_ITEMS_MISMATCH");
      }

      const products = await tx.product.findMany({
        where: {
          id: {
            in: requestedProductIds,
          },
          isActive: true,
        },
      });

      if (products.length !== requestedProductIds.length) {
        throw new Error("INVALID_PRODUCTS");
      }

      const productMap = new Map(
        products.map((product) => [product.id, product])
      );

      let subtotal = 0;
      let discountAmount = 0;
      let taxableAmount = 0;
      let gstAmount = 0;

      const quotationItems = data.items.map((item) => {
        const product = productMap.get(item.productId);

        if (!product) {
          throw new Error("INVALID_PRODUCT");
        }

        const unitPrice = Number(product.basePrice);

        const grossAmount = roundMoney(
          unitPrice * item.quantity
        );

        const itemDiscount = roundMoney(
          grossAmount * (data.discountPercent / 100)
        );

        const itemTaxable = roundMoney(
          grossAmount - itemDiscount
        );

        const itemGst = roundMoney(
          itemTaxable * (data.gstPercent / 100)
        );

        const lineAmount = roundMoney(
          itemTaxable + itemGst
        );

        subtotal += grossAmount;
        discountAmount += itemDiscount;
        taxableAmount += itemTaxable;
        gstAmount += itemGst;

        return {
          productId: item.productId,
          quantity: item.quantity,
          unitPrice,
          discountPercent: data.discountPercent,
          gstPercent: data.gstPercent,
          lineAmount,
        };
      });

      subtotal = roundMoney(subtotal);
      discountAmount = roundMoney(discountAmount);
      taxableAmount = roundMoney(taxableAmount);
      gstAmount = roundMoney(gstAmount);

      const grandTotal = roundMoney(
        taxableAmount + gstAmount
      );

      const quotationNumber = await generateQuotationNumber(tx);

      const createdQuotation = await tx.quotation.create({
        data: {
          quotationNumber,
          enquiryId: enquiry.id,
          customerId: enquiry.customerId,
          createdById: req.user!.userId,
          quotationDate: new Date(),
          validUntil: data.validUntil,
          discountPercent: data.discountPercent,
          gstPercent: data.gstPercent,
          subtotal,
          discountAmount,
          taxableAmount,
          gstAmount,
          grandTotal,
          status: "DRAFT",
          items: {
            create: quotationItems,
          },
        },
        include: {
          customer: true,
          enquiry: true,
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      await tx.enquiry.update({
        where: {
          id: enquiry.id,
        },
        data: {
          status: "QUOTED",
        },
      });

      return createdQuotation;
    });

    return res.status(201).json({
      success: true,
      message: "Quotation created successfully",
      data: quotation,
    });
  } catch (error) {
    console.error("Create quotation error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "";

    const errorResponses: Record<
      string,
      { status: number; message: string }
    > = {
      ENQUIRY_NOT_FOUND: {
        status: 404,
        message: "Enquiry not found",
      },
      QUOTATION_ALREADY_EXISTS: {
        status: 409,
        message: "A quotation already exists for this enquiry",
      },
      INVALID_ENQUIRY_STATUS: {
        status: 400,
        message: "Quotation can only be created for a NEW enquiry",
      },
      DUPLICATE_PRODUCTS: {
        status: 400,
        message: "Duplicate products are not allowed",
      },
      PRODUCT_NOT_IN_ENQUIRY: {
        status: 400,
        message: "Quotation contains a product not present in the enquiry",
      },
      QUANTITY_MISMATCH: {
        status: 400,
        message: "Quotation quantity must match enquiry quantity",
      },
      ENQUIRY_ITEMS_MISMATCH: {
        status: 400,
        message: "Quotation must contain all enquiry products",
      },
      INVALID_PRODUCTS: {
        status: 400,
        message: "One or more products are invalid or inactive",
      },
      INVALID_PRODUCT: {
        status: 400,
        message: "Invalid product",
      },
    };

    const response = errorResponses[errorMessage];

    if (response) {
      return res.status(response.status).json({
        success: false,
        message: response.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create quotation",
    });
  }
};

export const getQuotations = async (
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

    const quotations = await prisma.quotation.findMany({
      include: {
        customer: true,
        enquiry: {
          select: {
            id: true,
            enquiryNumber: true,
            enquiryDate: true,
            requiredDate: true,
            status: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        items: {
          include: {
            product: true,
          },
        },
        salesOrder: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json({
      success: true,
      data: quotations,
    });
  } catch (error) {
    console.error("Get quotations error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch quotations",
    });
  }
};

export const updateQuotationStatus = async (
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

    const data = req.body as UpdateQuotationStatusInput;

    const quotation = await prisma.quotation.findUnique({
      where: {
        id: quotationId,
      },
      include: {
        salesOrder: true,
      },
    });

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: "Quotation not found",
      });
    }

    const currentStatus = quotation.status;
    const requestedStatus = data.status;

    const validTransitions: Record<
      string,
      string[]
    > = {
      DRAFT: ["SENT"],
      SENT: ["ACCEPTED", "REJECTED"],
      ACCEPTED: [],
      REJECTED: [],
    };

    if (
      !validTransitions[currentStatus].includes(
        requestedStatus
      )
    ) {
      return res.status(400).json({
        success: false,
        message: `Invalid quotation status transition from ${currentStatus} to ${requestedStatus}`,
      });
    }

    if (
      requestedStatus === "REJECTED" &&
      quotation.salesOrder
    ) {
      return res.status(400).json({
        success: false,
        message: "Quotation with a sales order cannot be rejected",
      });
    }

    const updatedQuotation =
      await prisma.$transaction(async (tx) => {
        const updated = await tx.quotation.update({
          where: {
            id: quotationId,
          },
          data: {
            status: requestedStatus,
          },
        });

        if (requestedStatus === "ACCEPTED") {
          await tx.enquiry.update({
            where: {
              id: quotation.enquiryId,
            },
            data: {
              status: "WON",
            },
          });
        }

        if (requestedStatus === "REJECTED") {
          await tx.enquiry.update({
            where: {
              id: quotation.enquiryId,
            },
            data: {
              status: "LOST",
            },
          });
        }

        return updated;
      });

    return res.status(200).json({
      success: true,
      message: `Quotation ${requestedStatus.toLowerCase()} successfully`,
      data: updatedQuotation,
    });
  } catch (error) {
    console.error("Update quotation status error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update quotation status",
    });
  }
};