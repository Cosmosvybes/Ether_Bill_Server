const { createSubaccount, getBanks, verifyAccount } = require("../../services/flutterwave");
const { createPaystackSubaccount, getPaystackBanks, verifyPaystackAccount } = require("../../services/paystack");
const { users } = require("../../utils/Mongo/collection/collection");
const { getUser } = require("../../Model/User/User");
const fs = require("fs");

exports.setupPayout = async (req, res) => {
    const { user } = req;
    const { bank_code, account_number, business_name, business_email, business_mobile, country, provider } = req.body;
    const activeProvider = provider || "flutterwave";

    try {
        fs.appendFileSync("serverLog.txt", `\n[PAYOUT_ENTRY] ${new Date().toISOString()}: user=${user}, bank=${bank_code}, acc=${account_number}, provider=${activeProvider}\n`);
    } catch (e) { }

    console.log("PAYOUT_SETUP_REQUEST:", { user, bank_code, account_number, business_name, activeProvider });

    if (!bank_code || !account_number) {
        return res.status(400).json({ response: "Bank code and account number are required" });
    }

    try {
        if (!user) return res.status(401).json({ response: "Unauthorized" });

        const userData = await getUser(user);
        if (!userData) return res.status(404).json({ response: "User not found" });

        let verification;
        let subaccountResult;
        let accountName = "";

        if (activeProvider === "paystack") {
            // Paystack flow
            verification = await verifyPaystackAccount(account_number, bank_code);
            console.log("PAYSTACK_VERIFICATION:", verification);

            if (!verification.status) {
                return res.status(400).json({ response: "Invalid Paystack Account details", error: verification.message });
            }
            accountName = verification.data.account_name;

            const subaccountData = {
                business_name: business_name || userData?.settings?.businessName || "Steadybill User",
                settlement_bank: bank_code,
                account_number: account_number,
                percentage_charge: 3
            };
            subaccountResult = await createPaystackSubaccount(subaccountData);
            console.log("PAYSTACK_SUBACCOUNT_RESPONSE:", subaccountResult);

            if (!subaccountResult.status) {
                return res.status(400).json({ response: subaccountResult.message || "Failed to create Paystack subaccount" });
            }

        } else {
            // Flutterwave flow (Legacy/Default)
            verification = await verifyAccount({ account_number, account_bank: bank_code });
            console.log("FLW_VERIFICATION:", verification);

            if (verification.status === "error") {
                return res.status(400).json({ response: "Invalid FLW Account details", error: verification.message });
            }
            accountName = verification.data ? (verification.data.account_name || verification.data.accountName) : "";

            const subaccountData = {
                account_bank: bank_code,
                account_number: account_number,
                business_name: business_name || userData?.settings?.businessName || "Steadybill User",
                business_email: business_email || user,
                business_mobile: business_mobile || "08000000000",
                country: country || "NG",
                split_value: 0.03
            };

            const idempotencyKey = `sub_${user.split('@')[0]}_${account_number}_${Date.now()}`;
            subaccountResult = await createSubaccount(subaccountData, "percentage", idempotencyKey);
            console.log("FLW_SUBACCOUNT_RESPONSE:", subaccountResult);

            if (subaccountResult.status !== "success" && subaccountResult.message?.toLowerCase().includes("already exists")) {
                const { listSubaccounts } = require("../../services/flutterwave");
                const listResp = await listSubaccounts();
                if (listResp.status === "success" && Array.isArray(listResp.data)) {
                    const existing = listResp.data.find(sub =>
                        sub.account_number === account_number &&
                        (sub.account_bank === bank_code || sub.bank_code === bank_code)
                    );
                    if (existing) {
                        subaccountResult = { status: "success", data: { ...existing, subaccount_id: existing.subaccount_id || existing.id } };
                    }
                }
            }

            if (subaccountResult.status !== "success") {
                return res.status(400).json({ response: subaccountResult.message || "Failed to create Flutterwave payout account" });
            }
        }

        const payoutDetails = {
            subaccount_id: activeProvider === "paystack" ? subaccountResult.data.subaccount_code : (subaccountResult.data.subaccount_id || subaccountResult.data.id),
            bank_name: (subaccountResult.data && subaccountResult.data.bank_name) || (activeProvider === "paystack" ? subaccountResult.data.settlement_bank : "Verified Bank"),
            bank_code: bank_code,
            account_number: account_number,
            account_name: accountName,
            verified: true,
            provider: activeProvider
        };

        console.log(`Saving ${activeProvider} Payout to DB:`, payoutDetails);

        // We store it in a way that supports multiple providers but keeps a primary "active" one
        // Migration: If the legacy 'payout' exists but the provider-specific one doesn't, migrate it.
        const updateDoc = {
            payout: payoutDetails,
            [`payouts.${activeProvider}`]: payoutDetails
        };

        if (userData.payout && !userData.payouts?.[userData.payout.provider || "flutterwave"]) {
            updateDoc[`payouts.${userData.payout.provider || "flutterwave"}`] = userData.payout;
        }

        await users.updateOne(
            { email: user },
            { $set: updateDoc }
        );
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
        const { account_number, bank_code, provider } = req.body;
        const activeProvider = provider || "flutterwave";
        console.log(`[RESOLVE_START] Request to resolve account: ${account_number} @ ${bank_code} (${activeProvider})`);

        if (!account_number || !bank_code) {
            console.log("[RESOLVE_ERROR] Missing parameters");
            return res.status(400).json({ response: "Account number and bank code required" });
        }

        let verification;
        if (activeProvider === "paystack") {
            verification = await verifyPaystackAccount(account_number, bank_code);
        } else {
            verification = await verifyAccount({ account_number, account_bank: bank_code });
        }

        console.log("RESOLVE_ACCOUNT_VERIFICATION_RESULT:", JSON.stringify(verification, null, 2));

        if (activeProvider === "paystack") {
            if (verification.status) {
                return res.status(200).json({ response: "Account verified", data: { account_name: verification.data.account_name } });
            }
        } else {
            if (verification.status === "success") {
                return res.status(200).json({ response: "Account verified", data: verification.data });
            }
        }

        console.error(`[RESOLVE_FAILURE] Verification failed: ${verification.message}`);
        return res.status(400).json({ response: verification.message || "Could not verify account details" });

    } catch (error) {
        console.error("[RESOLVE_EXCEPTION] Unexpected error:", error);
        return res.status(500).json({ response: "Internal Server Error" });
    }
};

exports.fetchBanks = async (req, res) => {
    try {
        const { country, provider } = req.query;
        const activeProvider = provider || "flutterwave";

        let response;
        if (activeProvider === "paystack") {
            response = await getPaystackBanks(country || "NG");
        } else {
            response = await getBanks(country || "NG");
        }

        if (response.status === "success" || response.status === true) {
            return res.status(200).json({ response: "Banks fetched", data: response.data });
        } else {
            return res.status(400).json({ response: response.message || "Failed to fetch banks" });
        }
    } catch (error) {
        console.error("Get Banks Error:", error);
        return res.status(500).json({ response: "Internal Server Error" });
    }
};
