import express from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import {
  createGoal,
  getTeamGoals,
  updateGoal,
  deleteGoal,
  createMilestone,
  updateMilestone,
  deleteMilestone,
  createGoalUpdate
} from "../controllers/goal.controller.js";

const router = express.Router();

router.use(requireAuth);

router.post("/", createGoal);
router.get("/team/:teamId", getTeamGoals);
router.patch("/:goalId", updateGoal);
router.delete("/:goalId", deleteGoal);

router.post("/:goalId/milestones", createMilestone);
router.patch("/:goalId/milestones/:milestoneId", updateMilestone);
router.delete("/:goalId/milestones/:milestoneId", deleteMilestone);

router.post("/:goalId/updates", createGoalUpdate);

export default router;