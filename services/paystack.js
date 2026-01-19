const https = require('https');
const { config } = require("dotenv");
config();

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

// Helper for Paystack API requests
const paystackRequest = (path, method = 'GET', body = null) => {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.paystack.co',
            port: 443,
            path: path,
            method: method,
            headers: {
                Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(options, res => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    resolve(response);
                } catch (error) {
                    reject(error);
                }
            });
        });

        req.on('error', error => { reject(error); });
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
};

exports.verifyPaystackTransaction = (reference) => {
    return paystackRequest(`/transaction/verify/${reference}`);
};

/**
 * Fetch list of banks from Paystack
 */
exports.getPaystackBanks = (country = 'nigeria') => {
    return paystackRequest(`/bank?country=${country}`);
};

/**
 * Resolve Account Number via Paystack
 */
exports.verifyPaystackAccount = (account_number, bank_code) => {
    return paystackRequest(`/bank/resolve?account_number=${account_number}&bank_code=${bank_code}`);
};

/**
 * Create a Subaccount in Paystack
 * @param {Object} data - { business_name, settlement_bank, account_number, percentage_charge }
 */
exports.createPaystackSubaccount = (data) => {
    const body = {
        business_name: data.business_name,
        settlement_bank: data.settlement_bank, // bank_code
        account_number: data.account_number,
        percentage_charge: data.percentage_charge || 3 // Default to 3%
    };
    return paystackRequest('/subaccount', 'POST', body);
};
