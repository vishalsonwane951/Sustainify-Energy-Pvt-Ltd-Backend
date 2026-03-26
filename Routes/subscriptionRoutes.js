import { Router } from "express";
import { body } from "express-validator";
import rateLimit from "express-rate-limit";
import {
  subscribe,
  unsubscribe,
  getStats,
  getAllSubscribers,
  toggleSubscriber,
  deleteSubscriber,
} from "../Controller/subscriptionController.js";

const router = Router();

const subscribeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: "Too many attempts. Please try again in 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post(
  "/",
  subscribeLimiter,
  [body("email").isEmail().withMessage("Valid email required.").normalizeEmail()],
  subscribe
);

router.get("/unsubscribe/:token", unsubscribe);
router.get("/all", getAllSubscribers);
router.get("/stats", getStats);
router.patch("/toggle", toggleSubscriber);
router.delete("/:email", deleteSubscriber);

export { router as subscriptionRoutes };