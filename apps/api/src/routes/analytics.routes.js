import express from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import {
  getWorkspaceAnalytics,
  exportWorkspaceCsv
} from "../controllers/analytics.controller.js";

const router = express.Router();

router.use(requireAuth);

router.get("/:teamId", getWorkspaceAnalytics);
router.get("/:teamId/export.csv", exportWorkspaceCsv);

export default router;