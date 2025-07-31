const {
  addDealProofs,
  getEscrowById,
} = require("../../controller/controls/escrowProof");

exports.uploadEscrowDealDocs = async (req, res) => {
  const { escrowID, file } = req.body;
  try {
    const { response } = await addDealProofs(escrowID, file);
    res.status(200).send({ response });
  } catch (error) {
    res.status(503).send({ response: "Internal sever error" });
  }
};

exports.getUploadedEscrowDocs = async (req, res) => {
  const { escrowID } = req.query;
  try {
    const escrowProofs = await getEscrowById(escrowID);
    if (!escrowProofs)
      return res.status(200).send({ response: "No escrow or files attached yet" });
    return res.status(200).send(escrowProofs);
  } catch (error) {
    res.status(500).send({ response: "Internal sever error" });
  }
};

