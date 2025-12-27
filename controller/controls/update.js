const { getUser } = require("../../Model/User/User");
const { users } = require("../../utils/Mongo/collection/collection");
const { findInvoice, findSentInvoice } = require("./get");

exports.update = async (user_, invoice) => {
  const updateResult = await users.updateOne(
    { email: user_, "draft.id": Number(invoice.id) },
    { $set: { "draft.$": invoice } }
  );
  return updateResult.modifiedCount;
};

exports.paidUpdate = async (user_, invoiceID, transactionId) => {
  const user = await getUser(user_);

  // 1. Check if transaction was already processed
  if (transactionId && user.processedPayments && user.processedPayments.includes(transactionId)) {
    return 0; // Already processed
  }

  // 2. Check if invoice is already marked as paid
  const isAlreadyPaid = user.paid && user.paid.some(inv => String(inv.id) === String(invoiceID));
  if (isAlreadyPaid) return 0;

  const invoice = await findSentInvoice(user_, invoiceID);
  if (!invoice) return 0; // Not found in sent, maybe already moved or deleted

  invoice.status = "paid";

  const updateQuery = {
    $push: { paid: { ...invoice } },
    $pull: { sent: { id: String(invoiceID) } }
  };

  // 3. Track transactionId if provided
  if (transactionId) {
    updateQuery.$addToSet = { processedPayments: transactionId };
  }

  const response = await users.updateOne(
    { email: user_ },
    updateQuery
  );

  return response.modifiedCount;
};
