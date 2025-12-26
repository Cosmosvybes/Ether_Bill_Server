const { verifyPaddleWebhook } = require("../../services/paddle");
const { users } = require("../../utils/Mongo/collection/collection");

exports.handlePaddleWebhook = async (req, res) => {
    try {
        const isValid = verifyPaddleWebhook(req);
        if (!isValid) return res.status(403).send("Invalid signature");

        const event = req.body;
        console.log("Paddle Webhook Received:", event.event_type);

        switch (event.event_type) {
            case "transaction.completed":
                const customerEmail = event.data.customer.email;
                if (customerEmail) {
                    console.log(`Upgrading user: ${customerEmail}`);
                    await users.updateOne(
                        { email: customerEmail },
                        { $set: { isSubscribed: true } }
                    );
                }
                break;
            // Add cancellation logic here later
        }

        res.status(200).send("Webhook processed");
    } catch (error) {
        console.error("Webhook Error:", error);
        res.status(500).send("Server Error");
    }
};
