const https = require('https');
const { config } = require("dotenv");
config();

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

exports.verifyPaystackTransaction = (reference) => {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.paystack.co',
            port: 443,
            path: `/transaction/verify/${reference}`,
            method: 'GET',
            headers: {
                Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`
            }
        };

        const req = https.request(options, res => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    resolve(response);
                } catch (error) {
                    reject(error);
                }
            });
        });

        req.on('error', error => {
            reject(error);
        });

        req.end();
    });
};
