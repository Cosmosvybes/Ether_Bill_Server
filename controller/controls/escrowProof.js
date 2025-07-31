const { escrowProofs } = require("../../utils/Mongo/collection/collection");

exports.addDealProofs = async (escrowId, file) => {
  try {
    const escrowExist = await getEscrowById(escrowId);

    if (!escrowExist) {
      const { insertedId } = await escrowProofs.insertOne({
        escrowId,
        filesURl: [file],
      });
      if (insertedId) {
        return { response: "Document successfully uploaded" };
      }
    }
    const { modifiedCount } = await escrowProofs.updateOne(
      { escrowId: String(escrowId) },
      { $push: { filesURl: file } }
    );
    return modifiedCount == 1
      ? { response: "New File successfully added." }
      : { response: "Operation failed" };
  } catch (error) {
    throw new Error("Operation failed");
  }
};

async function getEscrowById(escrowId) {
  try {
    const escrow = await escrowProofs.findOne({ escrowId: escrowId });
    if (!escrow) return null;
    return escrow;
  } catch (error) {
    return new Error("Operation failed");
  }
}
exports.getEscrowById = getEscrowById;
