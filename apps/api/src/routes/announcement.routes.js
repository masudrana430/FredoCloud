import express from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/upload.middleware.js";
import {
  createAnnouncement,
  getTeamAnnouncements,
  updateAnnouncement,
  deleteAnnouncement
} from "../controllers/announcement.controller.js";

const router = express.Router();

router.use(requireAuth);

router.post("/", upload.single("attachment"), createAnnouncement);
router.get("/team/:teamId", getTeamAnnouncements);
router.patch("/:announcementId", upload.single("attachment"), updateAnnouncement);
router.delete("/:announcementId", deleteAnnouncement);

export default router;