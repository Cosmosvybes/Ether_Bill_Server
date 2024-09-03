const { getUser } = require("../../Model/User/User");
const { users } = require("../../utils/Mongo/collection/collection");

exports.update = async (user_, invoice) => {
  const updateResult = await users.updateOne(
    { email: user_, "draft.id": invoice.id },
    { $set: { "draft.$": invoice } }
  );
  return updateResult.modifiedCount;
};
