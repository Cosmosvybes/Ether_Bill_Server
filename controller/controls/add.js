const { users } = require("../../utils/Mongo/collection/collection");

exports.addSentInvoice = async (user, invoice) => {
  const response = await users.updateOne(
    { email: user },
    { $push: { sent: { ...invoice } } }
  );
  return response.modifiedCount;
};

exports.addToDraft = async (user, invoice) => {
  const response = await users.updateOne(
    { email: user },
    { $push: { draft: { ...invoice } } }
  );
  return response.modifiedCount;
};
