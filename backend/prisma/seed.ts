import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding SupplyFlow ERP database...");

  const adminPassword = await bcrypt.hash("Admin@123", 10);
  const salesPassword = await bcrypt.hash("Sales@123", 10);

  await prisma.user.upsert({
    where: {
      email: "admin@supplyflow.com",
    },
    update: {},
    create: {
      name: "System Administrator",
      email: "admin@supplyflow.com",
      passwordHash: adminPassword,
      role: UserRole.ADMIN,
      isActive: true,
    },
  });

  await prisma.user.upsert({
    where: {
      email: "sales@supplyflow.com",
    },
    update: {},
    create: {
      name: "Sales Executive",
      email: "sales@supplyflow.com",
      passwordHash: salesPassword,
      role: UserRole.SALES_USER,
      isActive: true,
    },
  });

  const products = [
    {
      productCode: "IND-PUMP-001",
      productName: "Industrial Water Pump",
      category: "Pumps",
      unit: "Piece",
      basePrice: 18500,
      physicalQty: 100,
    },
    {
      productCode: "IND-MOTOR-001",
      productName: "Three Phase Industrial Motor",
      category: "Motors",
      unit: "Piece",
      basePrice: 32000,
      physicalQty: 75,
    },
    {
      productCode: "IND-VALVE-001",
      productName: "Industrial Control Valve",
      category: "Valves",
      unit: "Piece",
      basePrice: 8500,
      physicalQty: 150,
    },
    {
      productCode: "IND-BEAR-001",
      productName: "Heavy Duty Ball Bearing",
      category: "Bearings",
      unit: "Piece",
      basePrice: 2400,
      physicalQty: 500,
    },
    {
      productCode: "IND-COMP-001",
      productName: "Industrial Air Compressor",
      category: "Compressors",
      unit: "Piece",
      basePrice: 67500,
      physicalQty: 40,
    },
    {
      productCode: "IND-GEAR-001",
      productName: "Industrial Gearbox",
      category: "Gearboxes",
      unit: "Piece",
      basePrice: 42500,
      physicalQty: 60,
    },
    {
      productCode: "IND-FLTR-001",
      productName: "Industrial Hydraulic Filter",
      category: "Filtration",
      unit: "Piece",
      basePrice: 5600,
      physicalQty: 200,
    },
    {
      productCode: "IND-PANEL-001",
      productName: "Industrial Control Panel",
      category: "Electrical",
      unit: "Piece",
      basePrice: 28500,
      physicalQty: 50,
    },
  ];

  for (const item of products) {
    const product = await prisma.product.upsert({
      where: {
        productCode: item.productCode,
      },
      update: {
        productName: item.productName,
        category: item.category,
        unit: item.unit,
        basePrice: item.basePrice,
        isActive: true,
      },
      create: {
        productCode: item.productCode,
        productName: item.productName,
        category: item.category,
        unit: item.unit,
        basePrice: item.basePrice,
        isActive: true,
      },
    });

    await prisma.inventory.upsert({
      where: {
        productId: product.id,
      },
      update: {
        physicalQty: item.physicalQty,
      },
      create: {
        productId: product.id,
        physicalQty: item.physicalQty,
        reservedQty: 0,
      },
    });
  }

  console.log("Seed completed successfully.");
  console.log("Admin: admin@supplyflow.com / Admin@123");
  console.log("Sales: sales@supplyflow.com / Sales@123");
  console.log(`${products.length} products created/updated.`);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });