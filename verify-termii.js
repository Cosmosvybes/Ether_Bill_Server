const { sendSMS } = require("./utils/SMSService/SMSService");
require("dotenv").config();

async function verifyTermii() {
    console.log("--- Multi-Provider SMS Verification (Termii focus) ---");

    const termiiKey = process.env.TERMII_API_KEY;
    const termiiSender = process.env.TERMII_SENDER_ID;
    const testNumber = process.env.TEST_PHONE_NUMBER || "+2348028725431";

    console.log("Termii API Key present:", !!termiiKey);
    console.log("Termii Sender ID:", termiiSender || "NOT SET (Using default 'Steadybill')");
    console.log("Testing with number:", testNumber);

    console.log("\nTriggering sendSMS...");
    const result = await sendSMS(testNumber, "Test message from Steadybill via Termii. Cost-optimized for Africa!");

    if (result.success) {
        console.log("\n✅ SUCCESS!");
        console.log("Provider Used:", result.provider);
        console.log("Response:", result.response);
    } else {
        console.log("\n❌ FAILED");
        console.log("Provider Attempted:", result.provider || "Unknown");
        console.log("Error:", result.error);
    }
}

verifyTermii();
