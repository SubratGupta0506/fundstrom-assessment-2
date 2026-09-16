import { Router } from "express";
import {
  createEnquiry,
  getEnquiries,
} from "../controllers/enquiry.controller";
import { authenticate } from "../middleware/auth.middleware";
import { authorize } from "../middleware/role.middleware";
import { validate } from "../middleware/validation.middleware";
import { createEnquirySchema } from "../validators/enquiry.validator";

const router = Router();

router.post(
  "/",
  authenticate,
  authorize("ADMIN", "SALES_USER"),
  validate(createEnquirySchema),
  createEnquiry
);

router.get(
  "/",
  authenticate,
  authorize("ADMIN", "SALES_USER"),
  getEnquiries
);

export default router;