const { createSubaccount, getBanks, verifyAccount } = require("../../services/flutterwave");
const { users } = require("../../utils/Mongo/collection/collection");
const { getUser } = require("../../Model/User/User");
const fs = require("fs");

exports.setupPayout = async (req, res) => {
    const { user } = req;
    const { bank_code, account_number, business_name, business_email, business_mobile, country } = req.body;

    try {
        fs.appendFileSync("serverLog.txt", `\n[PAYOUT_ENTRY] ${new Date().toISOString()}: user=${user}, bank=${bank_code}, acc=${account_number}\n`);
    } catch (e) { }

    console.log("PAYOUT_SETUP_REQUEST:", { user, bank_code, account_number, business_name });

    if (!bank_code || !account_number) {
        return res.status(400).json({ response: "Bank code and account number are required" });
    }

    try {
        if (!user) return res.status(401).json({ response: "Unauthorized" });

        const userData = await getUser(user);
        if (!userData) return res.status(404).json({ response: "User not found" });

        // 3. Verify Account Number first
        const verification = await verifyAccount({ account_number, account_bank: bank_code });
        console.log("PAYOUT_VERIFICATION:", verification);

        if (verification.status === "error") {
            return res.status(400).json({ response: "Invalid Account details", error: verification.message });
        }

        const subaccountData = {
            account_bank: bank_code,
            account_number: account_number,
            business_name: business_name || userData?.settings?.businessName || "EtherBill User",
            business_email: business_email || user,
            business_mobile: business_mobile || "08000000000",
            country: country || "NG",
            split_value: 0.03
        };

        const idempotencyKey = `sub_${user.split('@')[0]}_${account_number}_${Date.now()}`;
        let fwResponse = await createSubaccount(subaccountData, "percentage", idempotencyKey);

        console.log("FLW_SUBACCOUNT_RESPONSE:", fwResponse);

        if (fwResponse.status !== "success") {
            // [NEW] If subaccount already exists, try to find it in the list
            if (fwResponse.message && fwResponse.message.toLowerCase().includes("already exists")) {
                console.log("Duplicate subaccount detected. Fetching existing subaccount ID...");
                const { listSubaccounts } = require("../../services/flutterwave");
                const listResp = await listSubaccounts();

                if (listResp.status === "success" && Array.isArray(listResp.data)) {
                    // Flutterwave might return bank_code or account_bank in the list
                    const existing = listResp.data.find(sub =>
                        sub.account_number === account_number &&
                        (sub.account_bank === bank_code || sub.bank_code === bank_code)
                    );
                    if (existing) {
                        console.log("Found existing subaccount:", existing.subaccount_id || existing.id);
                        // Ensure the data object has the consistent subaccount_id field we expect
                        fwResponse = {
                            status: "success",
                            data: {
                                ...existing,
                                subaccount_id: existing.subaccount_id || existing.id
                            }
                        };
                    }
                }
            }
        }

        if (fwResponse.status !== "success") {
            return res.status(400).json({
                response: fwResponse.message || "Failed to create payout account"
            });
        }

        const payoutDetails = {
            subaccount_id: (fwResponse.data && (fwResponse.data.subaccount_id || fwResponse.data.id)),
            bank_name: (fwResponse.data && fwResponse.data.bank_name) || "Verified Bank",
            bank_code: bank_code,
            account_number: account_number,
            account_name: verification.data ? (verification.data.account_name || verification.data.accountName) : "",
            verified: true
        };
        console.log("Saving Payout to DB:", payoutDetails);

        await users.updateOne({ email: user }, { $set: { payout: payoutDetails } });
        return res.status(200).json({ response: "Payout account set up successfully", data: payoutDetails });

    } catch (error) {
        console.error("Setup Payout Error:", error);

        try {
            fs.appendFileSync("serverLog.txt", `\n[PAYOUT_ERROR] ${new Date().toISOString()}: ${error.message}\nStack: ${error.stack}\n`);
        } catch (e) {
            console.error("Log Write Error:", e);
        }

        return res.status(500).json({
            response: error.message || "Internal Server Error",
            error: error.message,
            stack: error.stack
        });
    }
};

exports.resolveBankAccount = async (req, res) => {
    try {
        const { account_number, bank_code } = req.body;
        console.log(`[RESOLVE_START] Request to resolve account: ${account_number} @ ${bank_code}`);

        if (!account_number || !bank_code) {
            console.log("[RESOLVE_ERROR] Missing parameters");
            return res.status(400).json({ response: "Account number and bank code required" });
        }

        const verification = await verifyAccount({ account_number, account_bank: bank_code });
        console.log("RESOLVE_ACCOUNT_VERIFICATION_RESULT:", JSON.stringify(verification, null, 2));

        if (verification.status === "success") {
            console.log("[RESOLVE_SUCCESS] Account verified successfully");
            return res.status(200).json({ response: "Account verified", data: verification.data });
        } else {
            console.error(`[RESOLVE_FAILURE] Verification failed: ${verification.message}`);
            return res.status(400).json({ response: verification.message || "Could not verify account details" });
        }
    } catch (error) {
        console.error("[RESOLVE_EXCEPTION] Unexpected error:", error);
        return res.status(500).json({ response: "Internal Server Error" });
    }
};

exports.fetchBanks = async (req, res) => {
    try {
        const { country } = req.query;
        const response = await getBanks(country || "NG");

        if (response.status === "success") {
            return res.status(200).json({ response: "Banks fetched", data: response.data });
        } else {
            return res.status(400).json({ response: response.message || "Failed to fetch banks" });
        }
    } catch (error) {
        console.error("Get Banks Error:", error);
        return res.status(500).json({ response: "Internal Server Error" });
    }
};
