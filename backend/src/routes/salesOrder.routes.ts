import { Router } from "express";

import {
  getSalesOrders,
  confirmSalesOrder,
  dispatchSalesOrder,
} from "../controllers/salesOrder.controller";

import { authenticate } from "../middleware/auth.middleware";
import { authorize } from "../middleware/role.middleware";
import { validate } from "../middleware/validation.middleware";

import { createDispatchSchema } from "../validators/dispatch.validator";

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
  "/:id/dispatch",
  authenticate,
  authorize("ADMIN"),
  validate(createDispatchSchema),
  dispatchSalesOrder
);

export default router;