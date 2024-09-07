const { getUser } = require("../../Model/User/User");
const { users } = require("../../utils/Mongo/collection/collection");

exports.deleteDoc = async (id, user_) => {
  const user = await getUser(user_);
  const invoice = user.draft.find((doc) => doc.id == id);
  const response = await users.updateOne(
    { email: user_ },
    { $pull: { draft: { id: invoice.id } } }
  );
  return response;
};
