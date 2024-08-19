const { users } = require("../utils/collection");

exports.createAccount = async (user) => {
  const result = await users.insertOne({
    ...user,
    draft: [],
    sent: [],
    revenue: 0,
    clients: [],
    id: Date.now(),
  });
  return result;
};

exports.getUser = async (email) => {
  const user = await users.findOne({ email: email });
  return user;
};
