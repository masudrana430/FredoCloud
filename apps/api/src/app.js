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
import auditRoutes from "./routes/audit.routes.js";
import swaggerUi from "swagger-ui-express";
import { openApiSpec } from "./docs/openapi.js";

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

app.get("/api/docs.json", (req, res) => {
  res.json(openApiSpec);
});

app.use(
  "/api/docs",
  swaggerUi.serve,
  swaggerUi.setup(openApiSpec, {
    explorer: true,
    customSiteTitle: "Collaborative Team Hub API Docs"
  })
);

app.use("/api/auth", authRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/goals", goalRoutes);
app.use("/api/announcements", announcementRoutes);
app.use("/api/action-items", actionItemRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/audit-logs", auditRoutes);

app.use(errorMiddleware);

export default app;