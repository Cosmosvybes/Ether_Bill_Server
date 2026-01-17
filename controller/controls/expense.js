const { createExpense, getExpenses, deleteExpense, updateExpense } = require("../../Model/Expense");

exports.addExpense = async (req, res) => {
    const userEmail = req.user;
    const { amount, currency, category, description, date, receiptUrl } = req.body;

    if (!amount || !category || !date) {
        return res.status(400).send({ response: "Amount, Category, and Date are required" });
    }

    try {
        const expenseData = {
            userEmail,
            amount: Number(amount),
            currency: currency || "NGN",
            category,
            description,
            date,
            receiptUrl
        };

        const result = await createExpense(expenseData);
        return res.status(200).send({ response: "Expense added successfully", data: result });
    } catch (error) {
        console.error("Add Expense Error:", error);
        return res.status(500).send({ response: "Internal server error" });
    }
};

exports.fetchExpenses = async (req, res) => {
    const userEmail = req.user;
    try {
        const expenses = await getExpenses(userEmail);
        // Sort by date descending
        expenses.sort((a, b) => new Date(b.date) - new Date(a.date));
        return res.status(200).send({ response: "Expenses fetched", data: expenses });
    } catch (error) {
        console.error("Fetch Expenses Error:", error);
        return res.status(500).send({ response: "Internal server error" });
    }
};

exports.removeExpense = async (req, res) => {
    const userEmail = req.user;
    const { id } = req.params;

    try {
        const success = await deleteExpense(userEmail, id);
        if (success) {
            return res.status(200).send({ response: "Expense deleted successfully" });
        }
        return res.status(404).send({ response: "Expense not found" });
    } catch (error) {
        console.error("Delete Expense Error:", error);
        return res.status(500).send({ response: "Internal server error" });
    }
};
