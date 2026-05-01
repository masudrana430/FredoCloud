import express from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import {
  createActionItem,
  getTeamActionItems,
  updateActionItem,
  deleteActionItem
} from "../controllers/actionItem.controller.js";

const router = express.Router();

router.use(requireAuth);

router.post("/", createActionItem);
router.get("/team/:teamId", getTeamActionItems);
router.patch("/:itemId", updateActionItem);
router.delete("/:itemId", deleteActionItem);

export default router;