import { Router } from "express";

import {
  getInventory,
  updateInventory,
} from "../controllers/inventory.controller";

import { authenticate } from "../middleware/auth.middleware";
import { authorize } from "../middleware/role.middleware";
import { validate } from "../middleware/validation.middleware";

import { updateInventorySchema } from "../validators/inventory.validator";

const router = Router();

router.get(
  "/",
  authenticate,
  authorize("ADMIN", "SALES_USER"),
  getInventory
);

router.patch(
  "/:productId",
  authenticate,
  authorize("ADMIN"),
  validate(updateInventorySchema),
  updateInventory
);

export default router;