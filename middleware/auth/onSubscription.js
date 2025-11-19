const { getUser } = require("../../Model/User/User");

async function onSubscrbibed(req, res, next) {
  const usermail = req.user;
  const user = await getUser(usermail);
  if (user)
    try {
      if (user.isSubscribed || user.freemiumInvoiceCount > 0) {
        next();
      } else
        return res.status(403).send({
          res: "Make your one time subscription, to start sending invoices",
        });
    } catch (error) {``
      res.status(500).send({ res: "Internal server error" });
    }
}

exports.onSubscription = onSubscrbibed;
