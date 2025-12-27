const { createSubaccount, getBanks, verifyAccount } = require("../../services/flutterwave");
const { users } = require("../../utils/Mongo/collection/collection");
const { getUser } = require("../../Model/User/User");

exports.setupPayout = async (req, res) => {
    const { user } = req; // Auth middleware attaches user email/id
    const { bank_code, account_number, business_name, business_email, business_mobile, country } = req.body;

    try {
        // 1. Verify Authentication
        if (!user) {
            return res.status(401).json({ response: "Unauthorized" });
        }

        // 2. Fetch User
        const userData = await getUser(user);
        if (!userData) {
            return res.status(404).json({ response: "User not found" });
        }

        // 3. Verify Account Number first (Optional but recommended)
        const verification = await verifyAccount({ account_number, account_bank: bank_code });
        if (verification.status === "error") {
            return res.status(400).json({ response: "Invalid Account details", error: verification.message });
        }

        // Check if names match reasonably well? For now, we trust the verifyAccount success.
        // Ideally, we show the resolved name to the user to confirm before creating subaccount.
        // For this flow, we assume the user confirmed it on frontend (we will add a verify step on FE).

        // 4. Create Subaccount on Flutterwave
        const subaccountData = {
            account_bank: bank_code,
            account_number: account_number,
            business_name: business_name || userData.settings.businessName || "EtherBill User",
            business_email: business_email || user,
            business_mobile: business_mobile || "",
            country: country || "NG",
            split_value: 0.05 // Default split or from user settings if we monetize
        };

        const fwResponse = await createSubaccount(subaccountData);

        if (fwResponse.status !== "success") {
            console.error("FW Subaccount Creation Failed:", fwResponse);
            return res.status(500).json({ response: "Failed to create payout account", error: fwResponse.message });
        }

        const subaccount_id = fwResponse.data.subaccount_id;

        // 5. Update User Record with Payout Details
        const payoutDetails = {
            subaccount_id: subaccount_id,
            bank_name: fwResponse.data.bank_name || "Unknown Bank", // FW might not return bank name in create response, depends on version
            bank_code: bank_code,
            account_number: account_number,
            account_name: verification.data ? verification.data.account_name : "", // Use verified name
            verified: true
        };

        await users.updateOne(
            { email: user },
            { $set: { payout: payoutDetails } }
        );

        return res.status(200).json({ response: "Payout account set up successfully", data: payoutDetails });

    } catch (error) {
        console.error("Setup Payout Error:", error);
        return res.status(500).json({ response: "Internal Server Error" });
    }
};

exports.resolveBankAccount = async (req, res) => {
    try {
        const { account_number, bank_code } = req.body;
        if (!account_number || !bank_code) {
            return res.status(400).json({ response: "Account number and bank code required" });
        }

        const verification = await verifyAccount({ account_number, account_bank: bank_code });
        if (verification.status === "success") {
            return res.status(200).json({ response: "Account verified", data: verification.data });
        } else {
            return res.status(400).json({ response: verification.message || "Could not verify account details" });
        }
    } catch (error) {
        console.error("Resolve Account Error:", error);
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
