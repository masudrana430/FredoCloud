import express from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { getAuditLogs, exportAuditLogsCsv } from "../controllers/audit.controller.js";

const router = express.Router();

router.use(requireAuth);

router.get("/:teamId", getAuditLogs);
router.get("/:teamId/export.csv", exportAuditLogsCsv);

export default router;