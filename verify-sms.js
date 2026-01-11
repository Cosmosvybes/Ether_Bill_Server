const { sendSMS } = require("./utils/SMSService/SMSService");
const { config } = require("dotenv");
config();

async function testSMS() {
    console.log("Starting SMS Test...");

    // Replace with a real number if you want to test actual delivery
    // Use E.164 format: +[country code][number]
    const testNumber = process.env.TEST_PHONE_NUMBER || "+1234567890";

    const result = await sendSMS(testNumber, "Test message from Steadybill SMS Service. Twilio is now integrated!");

    if (result.success) {
        console.log("✅ SMS Test Passed!");
    } else {
        console.log("❌ SMS Test Failed:", result.error);
        if (result.error === "Twilio credentials missing") {
            console.log("TIP: Please make sure TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER are set in your .env file.");
        }
    }
}

testSMS();
