import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import authRoutes from "./routes/auth.routes.js";
import teamRoutes from "./routes/team.routes.js";
import goalRoutes from "./routes/goal.routes.js";
import announcementRoutes from "./routes/announcement.routes.js";
import actionItemRoutes from "./routes/actionItem.routes.js";
import { errorMiddleware } from "./middlewares/error.middleware.js";
import notificationRoutes from "./routes/notification.routes.js";
import analyticsRoutes from "./routes/analytics.routes.js";

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true
  })
);

app.use(express.json());
app.use(cookieParser());

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    message: "API is running"
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/goals", goalRoutes);
app.use("/api/announcements", announcementRoutes);
app.use("/api/action-items", actionItemRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/analytics", analyticsRoutes);

app.use(errorMiddleware);

export default app;