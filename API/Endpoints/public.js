const { getPublicInvoice } = require("../../controller/controls/get");

exports.fetchPublicInvoice = async (req, res) => {
    const { id } = req.params;
    try {
        const data = await getPublicInvoice(id);
        if (!data) {
            return res.status(404).json({ response: "Invoice not found or invalid link." });
        }
        return res.status(200).json(data);
    } catch (error) {
        console.error("Public Invoice Error:", error);
        return res.status(500).json({ response: "Internal Server Error" });
    }
}

exports.verifyPublicPayment = async (req, res) => {
    const { invoiceId, transactionId } = req.body;
    const { verifyTransaction } = require("../../services/flutterwave");
    const { paidUpdate } = require("../../controller/controls/update");
    const { addRevenue } = require("../../controller");
    const { getPublicInvoice } = require("../../controller/controls/get");
    const { mailer } = require("../../utils/EmailService/Mailer");
    const { getUser } = require("../../Model/User/User");

    try {
        // 1. Verify Transaction with Flutterwave
        const verification = await verifyTransaction(transactionId);

        if (verification.status !== "success" || verification.data.status !== "successful") {
            return res.status(400).json({ response: "Payment verification failed or invalid." });
        }

        // 2. Validate Amount (Security check)
        const amount = verification.data.amount;
        // Use the actual verified amount from Flutterwave rather than trusting req.body if possible
        const verifiedAmount = Number(amount);

        // 3. Mark Invoice as Paid/Partially Paid in Database
        // We first need to find the merchant's email associated with this invoice
        const invoiceData = await getPublicInvoice(invoiceId);
        if (!invoiceData) return res.status(404).json({ response: "Invoice not found." });

        const merchantEmail = invoiceData.merchant.email;

        // [FIX] Update User Revenue Stat with verified amount
        await addRevenue(merchantEmail, invoiceId, verifiedAmount);

        // This function handles moving from sent -> paid or updating balance
        await paidUpdate(merchantEmail, invoiceId, transactionId, verifiedAmount);

        // 4. Notify Merchant via Email
        const user = await getUser(merchantEmail);
        // Check settings if they want notifications (defaulting to true if not set for safety)
        if (!user.settings || user.settings.revenueNotification !== false) {
            const amount = verification.data.amount;
            const currency = verification.data.currency;
            const payerEmail = verification.data.customer.email;

            await mailer(
                `💰 Payment Received: ${currency} ${amount}`,
                merchantEmail,
                `
                <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <h2 style="color: #7c3aed;">Cha-ching! Payment Received! 🚀</h2>
                    <p>Great news! You have received a payment for <strong>Invoice #${invoiceId}</strong>.</p>
                    
                    <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <p style="margin: 5px 0;"><strong>Amount:</strong> ${currency} ${amount}</p>
                        <p style="margin: 5px 0;"><strong>Payer:</strong> ${payerEmail}</p>
                        <p style="margin: 5px 0;"><strong>Ref:</strong> ${transactionId}</p>
                    </div>

                    <p>The funds should be settled to your connected account shortly.</p>
                    <p style="color: #6b7280; font-size: 12px;">Powered by Etherbill</p>
                </div>
                `
            );
        }

        return res.status(200).json({ response: "Payment verified and invoice updated!" });

    } catch (error) {
        console.error("Verification Error:", error);
        return res.status(500).json({ response: "Server Error during verification" });
    }
}
