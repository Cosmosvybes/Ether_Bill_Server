require("dotenv").config();
const { MongoClient } = require("mongodb");
const client = new MongoClient(process.env.MONGO_URL);
//db
exports.db = client.db("EtherBill");
