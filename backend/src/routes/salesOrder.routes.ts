import { Router } from "express";

import { getSalesOrders } from "../controllers/salesOrder.controller";

import { authenticate } from "../middleware/auth.middleware";
import { authorize } from "../middleware/role.middleware";

const router = Router();

router.get(
  "/",
  authenticate,
  authorize("ADMIN", "SALES_USER"),
  getSalesOrders
);

export default router;