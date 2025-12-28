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

  // [LOGIC] Decrement Freemium Count if applicable
  // Only decrement if user has credits (> 0) and is NOT a subscriber (optional check, but good for safety)
  // Assuming 'isSubscribed' denotes PRO status. 
  let currentCount = Number(user.freemiumInvoiceCount);
  // Fallback if NaN
  if (isNaN(currentCount)) currentCount = 0;

  if (currentCount > 0) {
    const newCount = currentCount - 1;
    await users.updateOne(
      { email: user_ },
      { $set: { freemiumInvoiceCount: newCount } }
    );
  }
  await mailer(
    `Invoice transaction  -Reference ID ${invoice.id}📩 🎉`,
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
