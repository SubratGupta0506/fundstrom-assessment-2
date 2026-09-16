import { Response } from "express";
import prisma from "../config/prisma";
import { AuthenticatedRequest } from "../middleware/auth.middleware";

export const getInventory = async (
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

    const inventory = await prisma.inventory.findMany({
      include: {
        product: true,
      },
      orderBy: {
        productId: "asc",
      },
    });

    const data = inventory.map((item) => ({
      id: item.id,
      productId: item.productId,
      productCode: item.product.productCode,
      productName: item.product.productName,
      category: item.product.category,
      unit: item.product.unit,
      physicalQty: item.physicalQty,
      reservedQty: item.reservedQty,
      availableQty: item.physicalQty - item.reservedQty,
    }));

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Get inventory error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch inventory",
    });
  }
};

export const updateInventory = async (
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

    const productId = Number(req.params.productId);

    if (!Number.isInteger(productId) || productId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    const { physicalQty, reservedQty } = req.body;

    if (
      !Number.isInteger(physicalQty) ||
      physicalQty < 0 ||
      !Number.isInteger(reservedQty) ||
      reservedQty < 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Physical quantity and reserved quantity must be non-negative integers",
      });
    }

    if (reservedQty > physicalQty) {
      return res.status(400).json({
        success: false,
        message: "Reserved quantity cannot exceed physical quantity",
      });
    }

    const product = await prisma.product.findUnique({
      where: {
        id: productId,
      },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const inventory = await prisma.inventory.upsert({
      where: {
        productId,
      },
      update: {
        physicalQty,
        reservedQty,
      },
      create: {
        productId,
        physicalQty,
        reservedQty,
      },
      include: {
        product: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Inventory updated successfully",
      data: {
        id: inventory.id,
        productId: inventory.productId,
        productCode: inventory.product.productCode,
        productName: inventory.product.productName,
        physicalQty: inventory.physicalQty,
        reservedQty: inventory.reservedQty,
        availableQty:
          inventory.physicalQty - inventory.reservedQty,
      },
    });
  } catch (error) {
    console.error("Update inventory error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update inventory",
    });
  }
};