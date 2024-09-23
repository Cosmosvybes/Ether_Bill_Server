const { users } = require("../../utils/Mongo/collection/collection");

exports.addSentInvoice = async (user, invoice) => {
  invoice.status = "sent";
  const response = await users.updateOne(
    { email: user },
    { $push: { sent: { ...invoice } } }
  );
  invoice.status = "Draft";
  await users.updateOne({ email: user }, { $pull: { draft: invoice } });
 
  return response.modifiedCount;
};

exports.addToDraft = async (user, invoice) => {
  const response = await users.updateOne(
    { email: user },
    { $push: { draft: { ...invoice } } }
  );
  return response.modifiedCount;
};

exports.addClient = async (user, client) => {
  const response = await users.updateOne(
    { email: user },
    { $push: { clients: { ...client } } }
  );
  return response.modifiedCount;
};
