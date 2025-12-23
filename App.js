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
    origin: "http://localhost:5173", // prod: "https://invoicelogger.netlify.app"
    optionsSuccessStatus: 200,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(json());

app.use(requestLogger());
app.use("/api", routes);

app.listen(PORT, () =>
  console.log(`Server instantiated on Worker ${PORT} on cpu ${process.pid}`)
);
