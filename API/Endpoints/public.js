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
