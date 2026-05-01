import express from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import {
  createGoal,
  getTeamGoals,
  updateGoal,
  deleteGoal
} from "../controllers/goal.controller.js";

const router = express.Router();

router.use(requireAuth);

router.post("/", createGoal);
router.get("/team/:teamId", getTeamGoals);
router.patch("/:goalId", updateGoal);
router.delete("/:goalId", deleteGoal);

export default router;