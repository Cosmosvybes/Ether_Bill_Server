const express = require("express");
const { json } = require("express");
const { urlencoded } = require("body-parser");
const cors = require("cors");
const { routes } = require("./API/routes/routes");
const app = express();

const { serverClusterer, requestLogger } = require("./_helper/cluster");
const PORT = process.env.PORT || 8080;
app.use(urlencoded({ extended: true }));
app.use(json());

// app use cors
app.use(
  cors({
    origin: "https://invoicelogger.netlify.app/", // prod: "https://invoicelogger.netlify.app"
    credentials: true,
    optionsSuccessStatus: 200,
  })
);
app.use(requestLogger());
app.use("/api", routes);

serverClusterer();

app.listen(PORT, () =>
  console.log(`Server instantiated on Worker  ${process.pid}`)
);
