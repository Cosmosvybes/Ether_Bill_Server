const { getUser } = require("../../Model/User/User");
exports.findInvoice = async (email, invoiceId) => {
  const user = await getUser(email);
  let invoice = user.draft.find((invoice) => invoice.id == invoiceId);
  return invoice;
};

exports.findSentInvoice = async (email, invoiceId) => {
  const user = await getUser(email);
  let invoice = user.sent.find((invoice) => invoice.id == String(invoiceId));
  return invoice;
};

exports.getRecurringInvoices = async (email) => {
  const user = await getUser(email);
  return user.recurring || [];
};

exports.getPublicInvoice = async (invoiceId) => {
  // Find the user who has this invoice in their sent array
  const { users } = require("../../utils/Mongo/collection/collection");

  // Note: invoiceId is string in DB usually, but passed as param.
  // We search where "sent.id" matches.
  const user = await users.findOne({ "sent.id": String(invoiceId) });

  if (!user) return null;

  const invoice = user.sent.find((inv) => String(inv.id) === String(invoiceId));

  // Return invoice + minimal merchant info (payout details)
  return {
    invoice,
    merchant: {
      businessName: user.settings.businessName,
      email: user.email,
      payout: user.payout // paying with subaccount
    }
  };
};
