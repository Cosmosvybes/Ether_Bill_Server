const { getUser } = require("../../Model/User/User");

exports.onSubscription = async (req, res, next) => {
  let _email = req.user;
  try {
    let account = await getUser(_email);
    let hasLowToken = account.token < 100;
    if (account.token == 0 && account.freemiumInvoiceCount == 0) {
      res.status(403).send({ response: "You are currently not subscribed" });
      //
    } else if (hasLowToken && account.freemiumInvoiceCount == 0) {
      return res.status(403).send({
        response: "token not enough to send invoice, add some token."
      });
    } else {
      return next();
    }
  } catch (err) {
    res.status(500).send({ response: "connection error" });
  }
};
