const { db } = require("./Mongo/mongo");
exports.users = db.collection("users");
