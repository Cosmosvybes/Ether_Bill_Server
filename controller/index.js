const { getUser } = require("../Model/User/User");
const { users } = require("../utils/Mongo/collection/collection");
const { addSentInvoice } = require("./controls/add");

exports.useAppSendInvoice = async (user_) => {
  const user = await getUser(user_);

  if (user.freemiumInvoiceCount != 0) {
    let freemiumCount = user.freemiumInvoiceCount - 1;
    await users.updateOne(
      { email: user_ },
      { $set: { freemiumInvoiceCount: freemiumCount } }
    );
    const updateRes = await addSentInvoice(user_, {});
    return updateRes;
    // then,  send invoice to customer with email template
  }
  const tokenBalance = (user.token -= 100);
  await users.updateOne({ email: user_ }, { $set: { token: tokenBalance } });
  const sentRes = await addSentInvoice(user_, {});
  return sentRes;
  // then,  send invoice to customer with email template
};


