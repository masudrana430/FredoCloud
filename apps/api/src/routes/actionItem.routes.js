import express from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/upload.middleware.js";
import {
  createActionItem,
  getTeamActionItems,
  updateActionItem,
  deleteActionItem
} from "../controllers/actionItem.controller.js";

const router = express.Router();

router.use(requireAuth);

router.post("/", upload.single("attachment"), createActionItem);
router.get("/team/:teamId", getTeamActionItems);
router.patch("/:itemId", upload.single("attachment"), updateActionItem);
router.delete("/:itemId", deleteActionItem);

export default router;