const { useAppSendInvoice } = require("../../controller");
const { addToDraft } = require("../../controller/controls/add");
const { deleteDoc } = require("../../controller/controls/delete");
const { update } = require("../../controller/controls/update");

exports.sendInvoice = async (req, res) => {
  const user = req.user;
  try {
    const response = await useAppSendInvoice(user);
    return (
      response && res.status(200).send({ response: "invoice sent to customer" })
    );
  } catch (error) {
    res.status(503).send({ response: "Something went wrong" });
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
    res.status(503).send({ response: "Something went wrong" });
  }
};

exports.updateInvoice = async (req, res) => {
  const user = req.user;
  const invoice = req.body;
  try {
    const response = await update(user, invoice);
    return (
      response && res.status(200).send({ response: "invoice details updated" })
    );
  } catch (error) {
    res.status(503).send({ response: "Something went wrong" });
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
    res.status(500).send({ response: "Something went wrong" });
  }
};
