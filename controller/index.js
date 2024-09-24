const { getUser } = require("../Model/User/User");
const { users } = require("../utils/Mongo/collection/collection");
const { mailer } = require("../utils/Nodemailer/Mailer");
const { addSentInvoice } = require("./controls/add");

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
  const tokenBalance = (user.token -= 100);
  await users.updateOne({ email: user_ }, { $set: { token: tokenBalance } });
  await mailer(
    `Transaction Invoice -Reference ID ${invoice.id}📩 🎉`,
    receipient,
    email
  );

  const sentRes = await addSentInvoice(user_, invoice);
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
