const express = require("express");
const { json } = require("express");
const PORT = process.env.PORT || 8080;
const { urlencoded } = require("body-parser");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const { routes } = require("./API/routes/routes");

const app = express();
app.use(urlencoded({ extended: true }));
app.use(cookieParser());
app.use(json());

// app use cors
app.use(
  cors({
    origin: "https://invoicelogger.netlify.app",
    credentials: true,
    optionsSuccessStatus: 200,
  })
);


// https://invoicelogger.netlify.app/
app.use("/api", routes);
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
