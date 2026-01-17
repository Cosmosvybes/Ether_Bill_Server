const { expenses } = require("../utils/Mongo/collection/collection");

exports.createExpense = async (data) => {
  const expense = {
    ...data,
    createdAt: new Date().toISOString(),
    id: Date.now().toString(), // Simple ID generation matching user ID style
  };
  const result = await expenses.insertOne(expense);
  return { ...expense, _id: result.insertedId };
};

exports.getExpenses = async (email, filters = {}) => {
  const query = { userEmail: email, ...filters };
  const result = await expenses.find(query).toArray();
  return result;
};

exports.deleteExpense = async (email, expenseId) => {
  const result = await expenses.deleteOne({ 
    userEmail: email, 
    id: expenseId 
  });
  return result.deletedCount > 0;
};

exports.updateExpense = async (email, expenseId, updates) => {
  const result = await expenses.updateOne(
    { userEmail: email, id: expenseId },
    { $set: updates }
  );
  return result.modifiedCount > 0;
};
