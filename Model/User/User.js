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
    paid: [],
    overdue: [],
    recurring: [], // [NEW] Store recurring profiles
    id: Date.now(),
    freemiumInvoiceCount: 3,
    token: 0,
    settings: {
      defaultCurrency: "",
      autoRenewal: false,
      businessName: "",
      businessAddress: "",
      sharingToken: false,
      paymentRecieivedNotification: true,
      revenueNotification: true, // [NEW] Match Frontend key
      autoChase: false,
      defaultPaymentTerms: false, // [NEW] 30 Days Default
      applyTax: false, // [NEW] Apply Tax Default
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
