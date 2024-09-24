const jwt = require("jsonwebtoken");
const { config } = require("dotenv");
config();

exports.Auth = (req, res, next) => {
  const tokenHeader = decodeURIComponent(req.header("Authorization"));
  const token = tokenHeader.split(" ")[1];
  try {
    if (!token) {
      return res.status(401).send({ response: "please sign in" });
    }
    const user = jwt.verify(token, process.env.EMAILPASS);
    req.user = user.userEmail;
    next();
  } catch (error) {
    res.status(403).send({ response: "session expired" });
  }
};
