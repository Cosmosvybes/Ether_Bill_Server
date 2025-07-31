const { db } = require("../mongo");
exports.users = db.collection("users");
exports.escrowProofs = db.collection("escrowProofs");
