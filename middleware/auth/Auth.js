const jwt = require("jsonwebtoken");

exports.Auth = (req, res, next) => {
  //
  const tokenHeader = decodeURIComponent(req.header("Authorization"));
  const token = tokenHeader.split(" ")[1];
  try {
    if (!token) {
      return res.status(401).send({ response: "please sign in" });
    }
    const user = jwt.verify(token, "secret");
    req.user = user.userEmail;
    next();
  } catch (error) {
    res.status(403).send({ response: "session expired" });
  }
};
