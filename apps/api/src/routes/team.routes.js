import express from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import {
  createTeam,
  getMyTeams,
  getTeamById,
  addTeamMember,
  removeTeamMember
} from "../controllers/team.controller.js";

const router = express.Router();

router.use(requireAuth);

router.post("/", createTeam);
router.get("/", getMyTeams);
router.get("/:teamId", getTeamById);
router.post("/:teamId/members", addTeamMember);
router.delete("/:teamId/members/:userId", removeTeamMember);

export default router;