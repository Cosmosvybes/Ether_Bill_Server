require("dotenv").config();
const express = require("express");
const { json } = require("express");
const cors = require("cors");
const { routes } = require("./API/routes/routes");
const app = express();
const initCronJobs = require("./cron"); // Import cron

// Initialize Cron Jobs
initCronJobs();

const { requestLogger } = require("./_helper/cluster");
const PORT = process.env.PORT || 8080;
app.use(express.urlencoded({ extended: false }));
app.use(
  cors({
    origin: ["http://localhost:5173", "https://invoice-logger.pxxl.click3", "https://invoicelogger.netlify.app"],
    optionsSuccessStatus: 200,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(json());

app.use(requestLogger());

// Rate Limiter
// const rateLimit = require("express-rate-limit");
// const limiter = rateLimit({
//   windowMs: 10 * 60 * 1000, // 10 minutes
//   max: 50, // Limit each IP to 50 requests per windowMs
//   standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
//   legacyHeaders: false, // Disable the `X-RateLimit-*` headers
//   message: { response: "Too many requests from this IP, please try again later." }
// });
// app.use(limiter);

app.use("/api", routes);

app.listen(PORT, () =>
  console.log(`Server instantiated on Worker ${PORT} on cpu ${process.pid}`)
);
