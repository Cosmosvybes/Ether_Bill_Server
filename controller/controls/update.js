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

exports.paidUpdate = async (user_, invoiceID, transactionId, amountPaid) => {
  const user = await getUser(user_);

  // 1. Check if transaction was already processed
  if (transactionId && user.processedPayments && user.processedPayments.includes(transactionId)) {
    return 0; // Already processed
  }

  // 2. Find the invoice in 'sent' array
  const invoiceIndex = user.sent ? user.sent.findIndex(inv => String(inv.id) === String(invoiceID)) : -1;

  if (invoiceIndex === -1) {
    // Check if it's already in 'paid' (maybe full payment already happened)
    const isAlreadyPaid = user.paid && user.paid.some(inv => String(inv.id) === String(invoiceID));
    if (isAlreadyPaid) return 0;
    return 0; // Not found
  }

  const invoice = user.sent[invoiceIndex];
  const totalAmount = Number(invoice.TOTAL);
  const currentAmountPaid = Number(invoice.amountPaid || 0);
  const newAmountPaid = currentAmountPaid + Number(amountPaid || totalAmount);
  const remainingBalance = totalAmount - newAmountPaid;

  invoice.amountPaid = newAmountPaid;
  invoice.balance = remainingBalance > 0 ? remainingBalance : 0;
  invoice.updatedAt = new Date().toISOString();

  let updateQuery = {};

  if (remainingBalance > 0) {
    // Partial Payment: Update status and keep in 'sent'
    invoice.status = "partially_paid";
    updateQuery = {
      $set: { [`sent.${invoiceIndex}`]: invoice }
    };
  } else {
    // Full Payment: Mark as paid and move to 'paid' array
    invoice.status = "paid";
    updateQuery = {
      $push: { paid: { ...invoice } },
      $pull: { sent: { id: String(invoiceID) } }
    };
  }

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

exports.deductSMSBalance = async (email) => {
  try {
    await users.updateOne(
      { email: email, smsBalance: { $gt: 0 } },
      { $inc: { smsBalance: -1 } }
    );
  } catch (error) {
    console.error("Failed to deduct SMS balance:", error);
  }
};
