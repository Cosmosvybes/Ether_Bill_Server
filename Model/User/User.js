const { users } = require("../../utils/Mongo/collection/collection");

exports.createAccount = async (user) => {
  const result = await users.insertOne({
    ...user,
    draft: [],
    sent: [],
    revenue: 0,
    clients: [],
    inbox: [],
    id: Date.now(),
    freemiumInvoiceCount: 0,
    token: 0,
    settings: {
      defaultCurrency: "",
      autoRenewal: false,
      businessName: "",
      businessAddress: "",
      sharingToken: false,
      paymentRecieivedNotification: true,
      businessAddress: "",
      businessName: "",
    },
  });
  return result;
};



exports.getUser = async (email) => {
  const user = await users.findOne({ email: email });
  return user;
};
