const { useAppSendInvoice, addRevenue } = require("../../controller");
const { addToDraft } = require("../../controller/controls/add");
const { deleteDoc } = require("../../controller/controls/delete");
const { findInvoice } = require("../../controller/controls/get");
const { update, paidUpdate } = require("../../controller/controls/update");

exports.sendInvoice = async (req, res) => {
  const user = req.user;
  const { sendAsMessage } = req.query;
  const { receipient, htmlContent, invoice } = req.body;
  try {
    const response = await useAppSendInvoice(
      user,
      receipient,
      htmlContent,
      invoice,
      sendAsMessage
    );
    return (
      response &&
      res.status(200).send({ response: "invoice sucessfully sent ! 🎉" })
    );
  } catch (error) {
    res.status(503).send({ response: "Service unavailable" });
  }
};

exports.draftInvoice = async (req, res) => {
  const user = req.user;
  const invoice = req.body;
  try {
    const response = await addToDraft(user, invoice);
    return (
      response && res.status(200).send({ response: "invoice added to draft" })
    );
  } catch (error) {
    res.status(503).send({ response: "Service unavailable" });
  }
};

exports.updateInvoice = async (req, res) => {
  const user = req.user;
  const invoice = req.body;
  try {
    const update_Res = await update(user, invoice);
    return update_Res && res.status(200).send({ response: "invoice updated" });
  } catch (error) {
    res.status(503).send({ response: "Service unavailable" });
  }
};

exports.deleteInvoice = async (req, res) => {
  const { id } = req.query;
  const email = req.user;
  try {
    const response = await deleteDoc(Number(id), email);
    return (
      response.matchedCount &&
      res.status(200).send({ response: "invoice deleted" })
    );
  } catch (error) {
    res.status(503).send({ response: "Service unavailbale, try again" });
  }
};

exports.getInvoice = async (req, res) => {
  const { id } = req.query;
  const email = req.user;
  try {
    const invoiceInformation = await findInvoice(email, id);
    res.status(200).send({ ...invoiceInformation });
  } catch (error) {
    res.status(503).send({ response: "Service unavailbale, try again" });
  }
};

exports.markAsPaid = async (req, res) => {
  const { invoiceID } = req.query;
  const email = req.user;
  try {
    const response = await addRevenue(email, invoiceID);
    await paidUpdate(email, invoiceID);

    // [NEW] Revenue Notification Logic
    const { getUser } = require("../../Model/User/User");
    const { mailer } = require("../../utils/Nodemailer/Mailer");
    const user = await getUser(email);

    if (user.settings && (user.settings.revenueNotification || user.settings.paymentRecieivedNotification)) {
      await mailer(
        "💰 Payment Received! Cha-ching!",
        user.email,
        `<h1>Great news!</h1><p>You have received a payment for Invoice #${invoiceID}.</p><p>Keep up the great work!</p>`
      );
    }

    return (
      response &&
      res
        .status(200)
        .send({ response: "Whoops, revenue generated 🎉🤑 More sales!!!" })
    );
  } catch (error) {
    res.status(503).send({ response: "Service unavailbale, try again" });
  }
};

exports.getRecurring = async (req, res) => {
  const email = req.user;
  const { getRecurringInvoices } = require("../../controller/controls/get");
  try {
    const recurringList = await getRecurringInvoices(email);
    res.status(200).send({ response: recurringList });
  } catch (error) {
    res.status(503).send({ response: "Service unavailable, try again" });
  }
};

exports.deleteRecurring = async (req, res) => {
  const { id } = req.query;
  const email = req.user;
  const { removeRecurringInvoice } = require("../../controller/controls/delete");
  try {
    const response = await removeRecurringInvoice(email, id);
    return (
      response.modifiedCount &&
      res.status(200).send({ response: "Recurring profile deleted" })
    );
  } catch (error) {
    res.status(503).send({ response: "Service unavailable, try again" });
  }
};
