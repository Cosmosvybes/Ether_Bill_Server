const jwt = require("jsonwebtoken");
const { config } = require("dotenv");
config();

exports.Auth = (req, res, next) => {
  try {
    const authHeader = req.header("Authorization");
    if (!authHeader) {
      return res.status(401).send({ response: "please sign in to your account" });
    }

    const tokenHeader = decodeURIComponent(authHeader);
    const token = tokenHeader.split(" ")[1];

    if (!token) {
      return res.status(401).send({ response: "please sign in to your account" });
    }

    const user = jwt.verify(token, process.env.EMAILPASS);
    req.user = user.userEmail;
    next();
  } catch (error) {
    console.error("Auth Middleware Error:", error.message);
    res.status(403).send({ response: "session expired , sign in again!" });
  }
};
