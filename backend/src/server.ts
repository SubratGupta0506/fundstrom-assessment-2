import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.routes";
import enquiryRoutes from "./routes/enquiry.routes";
import quotationRoutes from "./routes/quotation.routes";

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

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`SupplyFlow ERP API running on http://localhost:${PORT}`);
});