const { users } = require("../../utils/Mongo/collection/collection");

exports.createAccount = async (user) => {
  const result = await users.insertOne({
    ...user,
    draft: [],
    isSubscribed: false,
    sent: [],
    revenue: 0,
    clients: [],
    inbox: [],
    paid: [],
    overdue: [],
    recurring: [],
    id: Date.now(),
    isAdmin: false,
    emailVerified: false,
    phoneNumber: "",
    smsBalance: 3,
    freemiumInvoiceCount: 50,
    token: 0,
    settings: {
      defaultCurrency: "",
      autoRenewal: false,
      businessName: "",
      businessAddress: "",
      sharingToken: false,
      paymentRecieivedNotification: true,
      revenueNotification: true,
      smsNotification: false,
      autoChase: false,
      defaultPaymentTerms: false,
      applyTax: false,
      businessAddress: "",
      businessName: "",
    },
    payout: {
      subaccount_id: "",
      bank_name: "",
      account_number: "",
      account_name: "",
      bank_code: "",
      verified: false
    }
  });
  return result;
};

exports.getUser = async (email) => {
  const user = await users.findOne({ email: email });
  return user;
};
