const { getUser } = require("../../Model/User/User");

async function onSubscrbibed(req, res, next) {
  const usermail = req.user;
  const user = await getUser(usermail);
  if (user)
    try {
      if (user.freemiumInvoiceCount > 0) {
        next();
      } else if (user.isSubscribed && user.subscriptionExpiry) {
        const expiry = new Date(user.subscriptionExpiry);
        if (expiry > new Date()) {
          return next();
        } else {
          return res.status(403).send({
            res: "Your subscription has expired. Please renew to continue.",
          });
        }
      } else if (user.isSubscribed) {
        // Legacy support or fallback if expiry not set immediately
        next();
      } else {
        return res.status(403).send({
          res: "Subscribe to PRO to continue sending invoices",
        });
      }
    } catch (error) {
      ``
      res.status(500).send({ res: "Internal server error" });
    }
}

exports.onSubscription = onSubscrbibed;
