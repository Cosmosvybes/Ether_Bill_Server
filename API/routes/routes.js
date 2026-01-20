const express = require("express");
const { onSubscription } = require("../../middleware/auth/onSubscription");
const {
  signIn,
  signUp,
  userAccount,
  addNewClient,
  deleteClient,
  accountSettings,
  resetPasswordCode,
  verifyCode,
  updatePassword,
  upgradeUserSubscription,
  topupSMSCredits,
  resendVerification,
} = require("../Endpoints/account");

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

const { Auth } = require("./../../middleware/auth/Auth");
let router = express.Router(); // Router is an express package method that allows us to define our APi endpoints.


// System routes
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
router.delete("/client/delete", Auth, deleteClient);
router.post("/account/settings", Auth, accountSettings);
router.post("/reset-password", resetPasswordCode);
router.post("/verify_code", verifyCode);
router.post("/update_password", updatePassword);
router.post("/resend_verification", resendVerification);
router.post("/account/upgrade", Auth, upgradeUserSubscription);
router.post("/account/sms/topup", Auth, topupSMSCredits);
router.get("/escrow_proofs/", Auth, getUploadedEscrowDocs);
router.post("/upload/escrow_docs", Auth, uploadEscrowDealDocs);



// Recurring Routes
router.get("/invoice/recurring", Auth, getRecurring);
router.delete("/invoice/recurring", Auth, deleteRecurring);

const { setupPayout, fetchBanks, resolveBankAccount } = require("../../controller/controls/payout");
router.post("/payout/setup", Auth, setupPayout);
router.get("/payout/banks", Auth, fetchBanks);
router.post("/payout/resolve", Auth, resolveBankAccount);

// Admin Routes
const { isAdmin } = require("../../middleware/auth/isAdmin");
const { getStats, getAllUsers, toggleProStatus, adjustFreemiumCount, bulkAddFreemium, updateBroadcast, makeMeAdmin, sendBulkEmail } = require("../Endpoints/admin");
router.post("/dev/make-admin", Auth, makeMeAdmin);
router.get("/admin/stats", Auth, isAdmin, getStats);
router.get("/admin/users", Auth, isAdmin, getAllUsers);
router.patch("/admin/user/toggle-pro", Auth, isAdmin, toggleProStatus);
router.patch("/admin/user/adjust-freemium", Auth, isAdmin, adjustFreemiumCount);
router.post("/admin/users/bulk-add-credits", Auth, isAdmin, bulkAddFreemium);
router.post("/admin/broadcast/update", Auth, isAdmin, updateBroadcast);
router.post("/admin/mail/send", Auth, isAdmin, sendBulkEmail);

const { fetchPublicInvoice, verifyPublicPayment } = require("../Endpoints/public");
const { getBroadcast } = require("../Endpoints/public_info");
router.get("/public/invoice/:id", fetchPublicInvoice);
router.post("/public/invoice/verify", verifyPublicPayment);
router.get("/public/system/broadcast", getBroadcast);

exports.routes = router;
