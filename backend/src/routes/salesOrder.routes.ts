import { Router } from "express";
import {
  getSalesOrders,
  confirmSalesOrder,
  dispatchSalesOrder,
  cancelSalesOrder,
} from "../controllers/salesOrder.controller";
import { authenticate } from "../middleware/auth.middleware";
import { authorize } from "../middleware/role.middleware";

const router = Router();

router.get(
  "/",
  authenticate,
  authorize("ADMIN", "SALES_USER"),
  getSalesOrders
);

router.post(
  "/:id/confirm",
  authenticate,
  authorize("ADMIN"),
  confirmSalesOrder
);

router.post(
  "/:id/cancel",
  authenticate,
  authorize("ADMIN"),
  cancelSalesOrder
);

router.post(
  "/:id/dispatch",
  authenticate,
  authorize("ADMIN"),
  dispatchSalesOrder
);

export default router;