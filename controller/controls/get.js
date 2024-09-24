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
