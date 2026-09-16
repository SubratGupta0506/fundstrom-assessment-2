import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/auth.routes";
import enquiryRoutes from "./routes/enquiry.routes";
import quotationRoutes from "./routes/quotation.routes";
import salesOrderRoutes from "./routes/salesOrder.routes";
import inventoryRoutes from "./routes/inventory.routes";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
  })
);

app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    message: "SupplyFlow ERP API is running",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/enquiries", enquiryRoutes);
app.use("/api/quotations", quotationRoutes);
app.use("/api/sales-orders", salesOrderRoutes);
app.use("/api/inventory", inventoryRoutes);

export default app;