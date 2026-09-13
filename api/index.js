require("dotenv").config();
const express = require("express");
const cors = require("cors");
const serverless = require("serverless-http");

const { verifyToken } = require("../src/middleware/auth");
const authRoutes = require("../src/auth");
const homeRoutes = require("../src/home");
const projectRoutes = require("../src/project");
const furnitureRoutes = require("../src/furniture");

const app = express();

const allowedOrigins = [
    "http://localhost:5173",
    "https://cicstudio.vercel.app",
    "https://cic-front.vercel.app",
    "https://www.cicworks.com",
    "https://cicworks.com",
];

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());
app.use(verifyToken);

app.use("/api/auth", authRoutes);
app.use("/api", homeRoutes);
app.use("/api", projectRoutes);
app.use("/api", furnitureRoutes);

module.exports = app;