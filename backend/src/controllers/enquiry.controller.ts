import { Response } from "express";
import { Prisma, PrismaClient } from "@prisma/client";
import prisma from "../config/prisma";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { CreateEnquiryInput } from "../validators/enquiry.validator";

type TransactionClient = Prisma.TransactionClient;

const generateEnquiryNumber = async (
  tx: TransactionClient
): Promise<string> => {
  const year = new Date().getFullYear();

  const lastEnquiry = await tx.enquiry.findFirst({
    where: {
      enquiryNumber: {
        startsWith: `ENQ-${year}-`,
      },
    },
    orderBy: {
      id: "desc",
    },
  });

  const nextNumber = lastEnquiry
    ? Number(lastEnquiry.enquiryNumber.split("-")[2]) + 1
    : 1;

  return `ENQ-${year}-${String(nextNumber).padStart(5, "0")}`;
};

export const createEnquiry = async (
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

    const data = req.body as CreateEnquiryInput;

    if (data.requiredDate < new Date()) {
      return res.status(400).json({
        success: false,
        message: "Required date cannot be in the past",
      });
    }

    const productIds = data.items.map((item) => item.productId);

    if (new Set(productIds).size !== productIds.length) {
      return res.status(400).json({
        success: false,
        message: "Duplicate products are not allowed in an enquiry",
      });
    }

    const products = await prisma.product.findMany({
      where: {
        id: {
          in: productIds,
        },
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    if (products.length !== productIds.length) {
      return res.status(400).json({
        success: false,
        message: "One or more products are invalid or inactive",
      });
    }

    const enquiry = await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.create({
        data: {
          companyName: data.companyName,
          contactPerson: data.contactPerson,
          mobile: data.mobile,
          email: data.email.toLowerCase(),
          city: data.city,
        },
      });

      const enquiryNumber = await generateEnquiryNumber(tx);

      return tx.enquiry.create({
        data: {
          enquiryNumber,
          customerId: customer.id,
          createdById: req.user!.userId,
          enquiryDate: data.enquiryDate ?? new Date(),
          requiredDate: data.requiredDate,
          notes: data.notes,
          status: "NEW",
          items: {
            create: data.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
            })),
          },
        },
        include: {
          customer: true,
          items: {
            include: {
              product: true,
            },
          },
        },
      });
    });

    return res.status(201).json({
      success: true,
      message: "Enquiry created successfully",
      data: enquiry,
    });
  } catch (error) {
    console.error("Create enquiry error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create enquiry",
    });
  }
};

export const getEnquiries = async (
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

    const enquiries = await prisma.enquiry.findMany({
      include: {
        customer: true,
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
        quotation: {
          select: {
            id: true,
            quotationNumber: true,
            status: true,
            grandTotal: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json({
      success: true,
      data: enquiries,
    });
  } catch (error) {
    console.error("Get enquiries error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch enquiries",
    });
  }
};