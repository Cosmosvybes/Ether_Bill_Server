const { db } = require("../mongo");
exports.users = db.collection("users");
exports.escrowProofs = db.collection("escrowProofs");
exports.broadcasts = db.collection("broadcasts");
exports.expenses = db.collection("expenses");
exports.systemParams = db.collection("system_params");
