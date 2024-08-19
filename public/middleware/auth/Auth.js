const jwt = require("jsonwebtoken");

exports.Auth = (req, res, next) => {
  //
  const token = req.cookies.userToken;
  //
  try {
    if (!token) {
      return res.status(401).send({ response: "please sign in" });
    }
    const user = jwt.verify(token, "secret");
    req.user = user;
    next();
  } catch (error) {
    console.log(error);
  }
};
