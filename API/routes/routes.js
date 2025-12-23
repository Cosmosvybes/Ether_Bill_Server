const express = require("express");
const { onSubscription } = require("../../middleware/auth/onSubscription");
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
const rateLimiter = require("express-rate-limit");
// const { onSubscription } = require("../../middleware/auth/subscriptionAuth");
const {
  sendInvoice,
  draftInvoice,
  updateInvoice,
  deleteInvoice,
  getInvoice,
  markAsPaid,
  getRecurring,
  deleteRecurring,
} = require("../Endpoints/invoicing");
const { Proceed } = require("../Endpoints/proceed");
const {
  getUploadedEscrowDocs,
  uploadEscrowDealDocs,
} = require("../Endpoints/escrow");
const { getAccessCode } = require("../../services/paystack");
const { Auth } = require("./../../middleware/auth/Auth");
let router = express.Router(); // Router is an express package method that allows us to define our APi endpoints.

const limiter = rateLimiter({
  windowMs: 5 * 60 * 1000,
  limit: 2,
  handler: (req, res) => {
    res.status(429).send({ res: "Try again in the next 5 mins" });
  },
});

router.post("/new/invoice", Auth, draftInvoice);
router.get("/user/", Auth, userAccount);
router.get("/invoice", Auth, getInvoice);
router.patch("/invoice/mark-as-paid", Auth, markAsPaid);
router.post("/send/invoice", Auth, onSubscription, sendInvoice);

router.put("/invoice/updates", Auth, updateInvoice);
router.get("/dashboard", Auth, Proceed);
router.post("/sign-in", signIn);
router.post("/create_account", signUp);

router.delete("/invoice/delete", Auth, deleteInvoice);
router.post("/client/new", Auth, onSubscription, addNewClient);
router.post("/account/settings", Auth, accountSettings);
router.post("/reset-password", resetPasswordCode);
router.post("/verify_code", verifyCode);
router.post("/update_password", updatePassword);
router.get("/escrow_proofs/", Auth, getUploadedEscrowDocs);
router.post("/upload/escrow_docs", Auth, uploadEscrowDealDocs);
router.post("/one/time/payment", getAccessCode);

// Recurring Routes
router.get("/invoice/recurring", Auth, getRecurring);
router.delete("/invoice/recurring", Auth, deleteRecurring);

exports.routes = router;
