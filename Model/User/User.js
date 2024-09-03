const { users } = require("../../utils/Mongo/collection/collection");

exports.createAccount = async user => {
  const result = await users.insertOne({
    ...user,
    draft: [],
    sent: [],
    revenue: 0,
    clients: [],
    id: Date.now(),
    freemiumInvoiceCount: 0,
    token: 0
  });
  return result;
};

exports.getUser = async email => {
  const user = await users.findOne({ email: email });
  return user;
};
