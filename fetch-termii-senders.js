const https = require("https");
require("dotenv").config();

const termiiKey = process.env.TERMII_API_KEY;

if (!termiiKey) {
    console.error("TERMII_API_KEY is missing in .env");
    process.exit(1);
}

const options = {
    hostname: 'api.ng.termii.com',
    port: 443,
    path: `/api/sender-id?api_key=${termiiKey}`,
    method: 'GET'
};

console.log("Fetching Sender IDs from Termii...");

const req = https.request(options, (res) => {
    let resData = '';
    res.on('data', (chunk) => resData += chunk);
    res.on('end', () => {
        console.log("Response:", resData);
    });
});

req.on('error', (error) => {
    console.error("Error:", error);
});

req.end();
