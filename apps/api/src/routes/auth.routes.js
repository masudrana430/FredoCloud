import express from "express";
import {
  register,
  login,
  refresh,
  logout,
  getMe,
  uploadAvatar
} from "../controllers/auth.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/upload.middleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.get("/me", requireAuth, getMe);
router.patch("/avatar", requireAuth, upload.single("avatar"), uploadAvatar);

export default router;