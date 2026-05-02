import express from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import {
  createTeam,
  getMyTeams,
  getTeamById,
  updateTeam,
  inviteTeamMember,
  updateMemberRole,
  removeTeamMember
} from "../controllers/team.controller.js";

const router = express.Router();

router.use(requireAuth);

router.post("/", createTeam);
router.get("/", getMyTeams);
router.get("/:teamId", getTeamById);
router.patch("/:teamId", updateTeam);
router.post("/:teamId/invite", inviteTeamMember);
router.patch("/:teamId/members/:userId/role", updateMemberRole);
router.delete("/:teamId/members/:userId", removeTeamMember);

export default router;