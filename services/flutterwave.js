const Flutterwave = require("flutterwave-node-v3");

// Initialize Flutterwave with keys from .env
// Note: Ensure FLUTTERWAVE_PUBLIC_KEY and FLUTTERWAVE_SECRET_KEY are set in .env
let flw;
try {
    if (process.env.FLUTTERWAVE_PUBLIC_KEY && process.env.FLUTTERWAVE_SECRET_KEY) {
        flw = new Flutterwave(
            process.env.FLUTTERWAVE_PUBLIC_KEY,
            process.env.FLUTTERWAVE_SECRET_KEY
        );
    } else {
        console.warn("Flutterwave keys not found in environment variables. Service will not function.");
    }
} catch (e) {
    console.error("Failed to initialize Flutterwave:", e.message);
}

/**
 * Fetch list of banks for a specific country
 * @param {string} country - "NG", "GH", "KE", etc. Default "NG"
 */
exports.getBanks = async (country = "NG") => {
    if (!flw) return { status: "error", message: "Flutterwave not initialized" };
    try {
        const payload = {
            country: country, // Pass the country code
        };
        const response = await flw.Bank.country(payload);
        // console.log("Flutterwave Bank Fetch Response:", response);
        return response;
    } catch (error) {
        console.error("Error fetching banks from Flutterwave:", error.message || error);
        return { status: "error", message: error.message || "Failed to fetch banks" };
    }
};

/**
 * Create a subaccount for a user
 * @param {Object} data - { account_bank, account_number, business_name, business_email, split_value }
 * @param {string} split_type - "percentage" (default) or "flat"
 * @param {string} idempotencyKey - Optional key to prevent duplicate creation
 */
exports.createSubaccount = async (data, split_type = "percentage", idempotencyKey = null) => {
    if (!flw) return { status: "error", message: "Flutterwave not initialized - Check Server Env" };
    try {
        const payload = {
            account_bank: data.account_bank,
            account_number: data.account_number,
            business_name: data.business_name,
            business_email: data.business_email,
            business_contact: data.business_name,
            business_contact_mobile: data.business_mobile || "",
            business_mobile: data.business_mobile || "",
            country: "NG",
            split_type: split_type,
            split_value: data.split_value || 0.03,
        };

        // If idempotencyKey is provided, we pass it in the options
        // For flutterwave-node-v3, some methods accept headers in an options object
        const options = idempotencyKey ? { "X-Idempotency-Key": idempotencyKey } : {};

        const response = await flw.Subaccount.create(payload, options);
        return response;
    } catch (error) {
        return { status: "error", message: error.message, data: null };
    }
};

/**
 * Verify a Bank Account Number
 * @param {Object} data - { account_number, account_bank }
 */
exports.verifyAccount = async (data) => {
    if (!flw) return { status: "error", message: "Flutterwave not initialized" };
    try {
        const payload = {
            account_number: data.account_number,
            account_bank: data.account_bank
        }
        const response = await flw.Misc.verify_Account(payload)
        return response;
    } catch (error) {
        return { status: "error", message: error.message };
    }
}

/**
 * Verify a Transaction
 * @param {string} transactionId - The transaction ID to verify
 */
exports.verifyTransaction = async (transactionId) => {
    if (!flw) return { status: "error", message: "Flutterwave not initialized" };
    try {
        const response = await flw.Transaction.verify({ id: transactionId });
        return response;
    } catch (error) {
        console.error("Error verifying transaction:", error);
        return { status: "error", message: error.message };
    }
}

/**
 * List all subaccounts
 */
exports.listSubaccounts = async () => {
    if (!flw) return { status: "error", message: "Flutterwave not initialized" };
    try {
        const response = await flw.Subaccount.fetch_all();
        return response;
    } catch (error) {
        console.error("Error fetching subaccounts:", error);
        return { status: "error", message: error.message };
    }
};
