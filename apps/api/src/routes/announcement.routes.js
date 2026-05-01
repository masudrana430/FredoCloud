import express from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import {
  createAnnouncement,
  getTeamAnnouncements,
  updateAnnouncement,
  deleteAnnouncement
} from "../controllers/announcement.controller.js";

const router = express.Router();

router.use(requireAuth);

router.post("/", createAnnouncement);
router.get("/team/:teamId", getTeamAnnouncements);
router.patch("/:announcementId", updateAnnouncement);
router.delete("/:announcementId", deleteAnnouncement);

export default router;