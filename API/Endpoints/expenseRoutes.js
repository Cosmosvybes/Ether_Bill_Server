const express = require("express");
const { addExpense, fetchExpenses, removeExpense } = require("../../controller/controls/expense");
const { Auth } = require("../../middleware/auth/Auth");

const router = express.Router();

router.post("/", Auth, addExpense);
router.get("/", Auth, fetchExpenses);
router.delete("/:id", Auth, removeExpense);

exports.expenseRoutes = router;
