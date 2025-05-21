const express = require("express");
const {
  signIn,
  signUp,
  userAccount,
  addNewClient,
  accountSettings,
  resetPasswordCode,
  verifyCode,
  updatePassword,
} = require("../Endpoints/account");
const { Auth } = require("../../middleware/auth/Auth");
// const { onSubscription } = require("../../middleware/auth/subscriptionAuth");
const {
  sendInvoice,
  draftInvoice,
  updateInvoice,
  deleteInvoice,
  getInvoice,
  markAsPaid,
} = require("../Endpoints/invoicing");
const { Proceed } = require("../Endpoints/proceed");

let router = express.Router();
router.post("/new/invoice", Auth, draftInvoice);
router.get("/user/", Auth, userAccount);
router.get("/invoice", Auth, getInvoice);
router.patch("/invoice/mark-as-paid", Auth, markAsPaid);
router.post("/send/invoice", Auth, sendInvoice);

router.put("/invoice/updates", Auth, updateInvoice);
router.get("/dashboard", Auth, Proceed);
router.post("/sign-in", signIn);
router.post("/create_account", signUp);

router.delete("/invoice/delete", Auth, deleteInvoice);
router.post("/client/new", Auth, addNewClient);
router.post("/account/settings", Auth, accountSettings);
router.post("/reset-password", resetPasswordCode);
router.post("/verify_code", verifyCode);
router.post("/update_password", updatePassword);
exports.routes = router;
