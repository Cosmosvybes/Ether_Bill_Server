const { getUser } = require("../../Model/User/User");
const { users } = require("../../utils/Mongo/collection/collection");
const { findInvoice, findSentInvoice } = require("./get");

exports.update = async (user_, invoice) => {
  const updateResult = await users.updateOne(
    { email: user_, "draft.id": invoice.id },
    { $set: { "draft.$": invoice } }
  );
  return updateResult.modifiedCount;
};

exports.paidUpdate = async (user_, invoiceID) => {
  const invoice = await findSentInvoice(user_, invoiceID);

  invoice.status = "paid";
  const response = await users.updateOne(
    { email: user_ },
    { $push: { paid: { ...invoice } } }
  );
  invoice.status = "sent";
  delete invoice.token;
  await users.updateOne({ email: user_ }, { $pull: { sent: invoice } });
  return response.modifiedCount;
};
