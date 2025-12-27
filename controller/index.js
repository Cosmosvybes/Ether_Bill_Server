const { getUser } = require("../Model/User/User");
const { users } = require("../utils/Mongo/collection/collection");
const { mailer } = require("../utils/EmailService/Mailer");
const { addSentInvoice } = require("./controls/add");
const { findSentInvoice } = require("./controls/get");

exports.useAppSendInvoice = async (
  user_,
  receipient,
  email,
  invoice,
  sendAsMessage
) => {
  const user = await getUser(user_);
  if (user.freemiumInvoiceCount != 0) {
    let freemiumCount = user.freemiumInvoiceCount - 1;
    await users.updateOne(
      { email: user_ },
      { $set: { freemiumInvoiceCount: freemiumCount } }
    );
    await mailer(
      `Transaction Invoice -Reference ID ${invoice.id}📩 🎉`,
      receipient,
      email
    );
    const updateRes = await addSentInvoice(user_, invoice);
    if (sendAsMessage) {
      await users.updateOne(
        { email: receipient },
        { $push: { inbox: invoice } }
      );
    }
    return updateRes;
  }
  /* 
   * [NOTE] Tokens are no longer used for sending invoices.
   * Middleware ensures subscription/freemium access.
   */

  await mailer(
    `Transaction Invoice -Reference ID ${invoice.id}📩 🎉`,
    receipient,
    email
  );

  const sentRes = await addSentInvoice(user_, invoice);

  // [NEW] Handle Recurring
  if (invoice.recurring && invoice.recurring.frequency) {
    // Calculate next run
    const nextRun = new Date();
    if (invoice.recurring.frequency === "weekly") nextRun.setDate(nextRun.getDate() + 7);
    if (invoice.recurring.frequency === "monthly") nextRun.setMonth(nextRun.getMonth() + 1);

    const recurringProfile = {
      ...invoice,
      recurring: {
        ...invoice.recurring,
        nextRun: nextRun.toISOString()
      }
    };
    const { addRecurringInvoice } = require("./controls/add"); // late import to avoid circular dep if any (safe here)
    await addRecurringInvoice(user_, recurringProfile);
  }

  if (sendAsMessage) {
    await users.updateOne({ email: receipient }, { $push: { inbox: invoice } });
  }
  return sentRes;
};
exports.useAppSettings = async (user_, settings) => {
  const settingsRes = await users.updateOne(
    { email: user_ },
    { $set: { settings: { ...settings } } }
  );
  return settingsRes;
};

exports.addRevenue = async (user_, invoiceID) => {
  const invoice = await findSentInvoice(user_, invoiceID);
  const balance = invoice.TOTAL;
  const user = await getUser(user_);
  let currentRevenueBalance = user.revenue;
  let newBalance = Number(currentRevenueBalance) + Number(balance);
  const revenueBalanceUpadatedResponse = await users.updateOne(
    { email: user_ },
    { $set: { revenue: newBalance } }
  );
  return revenueBalanceUpadatedResponse.modifiedCount;
};
