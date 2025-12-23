require("dotenv").config();
const { MongoClient } = require("mongodb");

async function checkUser() {
    const uri = process.env.MONGO_URL;
    if (!uri) {
        console.error("MONGO_URL is missing from .env");
        return;
    }

    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log("Connected to MongoDB");

        const db = client.db("EtherBill");
        const users = db.collection("users");

        // Check for specific email
        const email = "alfredchrisayo@gmail.com";
        const user = await users.findOne({ email: email });

        if (user) {
            console.log(`User found: ${user.email}`);
            console.log(`User ID: ${user._id}`);
            console.log(`Password (Hashed/Plain): ${user.password}`);
        } else {
            console.log(`User ${email} NOT FOUND in 'users' collection.`);

            // List all users to see what's there
            const count = await users.countDocuments();
            console.log(`Total users in collection: ${count}`);
            if (count > 0) {
                const allUsers = await users.find().project({ email: 1 }).limit(5).toArray();
                console.log("First 5 users:", allUsers);
            }
        }

    } catch (err) {
        console.error("Error connecting/querying:", err);
    } finally {
        await client.close();
    }
}

checkUser();
