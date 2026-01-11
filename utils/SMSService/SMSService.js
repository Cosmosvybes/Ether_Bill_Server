const twilio = require("twilio");
const { config } = require("dotenv");
config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioNumber = process.env.TWILIO_PHONE_NUMBER;

// Only initialize if keys are present
let client;
if (accountSid && authToken) {
    client = twilio(accountSid, authToken);
}

/**
 * Global SMS Sender Service
 * @param {string} to - Recipient phone number in E.164 format (e.g., +1234567890)
 * @param {string} body - SMS message content
 */
exports.sendSMS = async (to, body) => {
    if (!client) {
        console.warn("[SMSService] Twilio credentials missing. SMS not sent.");
        return { success: false, error: "Twilio credentials missing" };
    }

    if (!to) {
        console.warn("[SMSService] No recipient phone number provided.");
        return { success: false, error: "No recipient phone number" };
    }

    console.log(`[SMSService] Sending SMS to ${to}...`);

    try {
        const message = await client.messages.create({
            body: body,
            from: twilioNumber,
            to: to,
        });

        console.log(`[SMSService] SMS Sent Successfully! SID: ${message.sid}`);
        return { success: true, sid: message.sid };
    } catch (error) {
        console.error("[SMSService] Error sending SMS:", error);
        return { success: false, error: error.message };
    }
};
