import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import invoiceRoutes from "./routes/invoiceRoutes";
import customerRoutes from "./routes/customerRoutes";
import transactionRoutes from "./routes/transactionRoutes";
import authRoutes from "./routes/authRoutes";
import analyticsRoutes from "./routes/analyticsRoutes";
import razorpayRoutes from "./routes/razorpayRoutes";

import { ConnectDB } from "./config/db";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT!);
app.set("trust proxy", 1);
const allowedOrigins =
  process.env.CORS_ORIGIN?.split(",").map(origin => origin.trim()) || [];


app.disable("x-powered-by");
app.use(helmet());
app.use(compression());


app.use(
  morgan(process.env.NODE_ENV === "production" ? "combined" : "dev")
);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});

app.use("/api", limiter);


app.use(
  cors({
    origin(
      origin: string | undefined,
      callback: (error: Error | null, success?: boolean) => void
    ) {
      // Allow requests with no origin (Postman, curl, server-to-server)
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS not allowed for origin: ${origin}`));
    },
    credentials: true,
  })
);
// Capture raw body for Razorpay webhook signature verification.
// Must be registered BEFORE express.json() so the raw buffer is preserved.
app.use(
  (req: express.Request & { rawBody?: Buffer }, _res: express.Response, next: express.NextFunction) => {
    if (req.path === '/api/razorpay/webhook') {
      let data = Buffer.alloc(0);
      req.on('data', (chunk: Buffer) => { data = Buffer.concat([data, chunk]); });
      req.on('end', () => {
        req.rawBody = data;
        next();
      });
    } else {
      next();
    }
  }
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));


app.get(
  "/api/health",
  (_req: express.Request, res: express.Response) => {
    res.json({
      status: "OK"
    });
  }
);

app.use("/api/auth", authRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/razorpay", razorpayRoutes);


app.use("*", (_req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});


app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

async function start() {
  try {
    await ConnectDB();

    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

    server.on("error", (err) => {
      console.error("❌ Server error:", err);
      process.exit(1);
    });

  } catch (err) {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
  }
}

start();

process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  process.exit(1);
});

export default app;