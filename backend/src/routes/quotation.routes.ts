import { Router } from "express";
import {
  createQuotation,
  getQuotations,
  updateQuotationStatus,
} from "../controllers/quotation.controller";
import { authenticate } from "../middleware/auth.middleware";
import { authorize } from "../middleware/role.middleware";
import { validate } from "../middleware/validation.middleware";
import {
  createQuotationSchema,
  updateQuotationStatusSchema,
} from "../validators/quotation.validator";

const router = Router();

router.post(
  "/",
  authenticate,
  authorize("ADMIN", "SALES_USER"),
  validate(createQuotationSchema),
  createQuotation
);

router.get(
  "/",
  authenticate,
  authorize("ADMIN", "SALES_USER"),
  getQuotations
);

router.patch(
  "/:id/status",
  authenticate,
  authorize("ADMIN", "SALES_USER"),
  validate(updateQuotationStatusSchema),
  updateQuotationStatus
);

export default router;