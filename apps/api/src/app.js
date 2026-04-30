import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import authRoutes from "./routes/auth.routes.js";
import { errorMiddleware } from "./middlewares/error.middleware.js";

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

app.use(errorMiddleware);

export default app;