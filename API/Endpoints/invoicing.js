const { useAppSendInvoice } = require("../../controller");
const { addToDraft } = require("../../controller/controls/add");
const { deleteDoc } = require("../../controller/controls/delete");
const { findInvoice } = require("../../controller/controls/get");
const { update } = require("../../controller/controls/update");

exports.sendInvoice = async (req, res) => {
  const user = req.user;
  const { sendAsMessage } = req.query;
  console.log(sendAsMessage)
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
