const twilio = require("twilio");
const { config } = require("dotenv");
const https = require("https"); // For Termii HTTP requests
config();

// Twilio Config
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioNumber = process.env.TWILIO_PHONE_NUMBER;

// Termii Config
const termiiKey = process.env.TERMII_API_KEY;
const termiiSenderId = process.env.TERMII_SENDER_ID || "Steadybill"; // Default fallback

// Multi-Provider Logic: African country codes
const AfricanCodes = [
    "+234", // Nigeria
    "+233", // Ghana
    "+254", // Kenya
    "+27",  // South Africa
    "+256", // Uganda
    "+255", // Tanzania
    "+212", // Morocco
    "+20",  // Egypt
];

// Initialize Twilio if keys are present
let twilioClient;
if (accountSid && authToken) {
    twilioClient = twilio(accountSid, authToken);
}

/**
 * Global SMS Sender Service
 * Uses Termii for Africa and Twilio for the rest of the world to optimize costs.
 * @param {string} to - Recipient phone number in E.164 format
 * @param {string} body - SMS message content
 */
exports.sendSMS = async (to, body) => {
    if (!to) return { success: false, error: "No recipient phone number" };

    const isAfrican = AfricanCodes.some(code => to.startsWith(code));

    if (isAfrican && termiiKey) {
        return await sendViaTermii(to, body);
    } else {
        return await sendViaTwilio(to, body);
    }
};

/**
 * Send SMS via Termii (Cost-effective for Africa)
 */
async function sendViaTermii(to, body) {
    console.log(`[SMSService] Sending via Termii to ${to}...`);

    // Remove '+' for Termii
    const cleanTo = to.startsWith("+") ? to.substring(1) : to;

    const data = JSON.stringify({
        api_key: termiiKey,
        to: cleanTo,
        from: termiiSenderId,
        sms: body,
        type: "plain",
        channel: "generic"
    });

    const options = {
        hostname: 'api.ng.termii.com',
        port: 443,
        path: '/api/sms/send',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length
        }
    };

    return new Promise((resolve) => {
        const req = https.request(options, (res) => {
            let resData = '';
            res.on('data', (chunk) => resData += chunk);
            res.on('end', () => {
                console.log(`[SMSService] Termii Response: ${resData}`);

                let parsed;
                try { parsed = JSON.parse(resData); } catch (e) { }

                // Termii returns 200 for success, but might include error codes in body
                if (res.statusCode === 200 && (!parsed || !parsed.code || parsed.code === "ok" || parsed.code === 200)) {
                    resolve({ success: true, provider: "Termii", response: resData });
                } else {
                    resolve({ success: false, provider: "Termii", error: parsed?.message || "Termii API Error", response: resData });
                }
            });
        });

        req.on('error', (error) => {
            console.error("[SMSService] Termii Error:", error);
            resolve({ success: false, provider: "Termii", error: error.message });
        });

        req.write(data);
        req.end();
    });
}

/**
 * Send SMS via Twilio (Global reach)
 */
async function sendViaTwilio(to, body) {
    if (!twilioClient) {
        console.warn("[SMSService] Twilio credentials missing.");
        return { success: false, error: "Twilio credentials missing" };
    }

    console.log(`[SMSService] Sending via Twilio to ${to}...`);
    try {
        const message = await twilioClient.messages.create({
            body: body,
            from: twilioNumber,
            to: to,
        });

        console.log(`[SMSService] Twilio Sent Successfully! SID: ${message.sid}`);
        return { success: true, provider: "Twilio", sid: message.sid };
    } catch (error) {
        console.error("[SMSService] Twilio Error:", error);
        return { success: false, provider: "Twilio", error: error.message };
    }
}
