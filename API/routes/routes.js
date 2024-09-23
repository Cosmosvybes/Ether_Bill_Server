const express = require("express");
const {
  signIn,
  signUp,
  userAccount,
  addNewClient,
  accountSettings,
} = require("../Endpoints/account");
const { Auth } = require("../../middleware/auth/Auth");
const { onSubscription } = require("../../middleware/auth/subscriptionAuth");
const {
  sendInvoice,
  draftInvoice,
  updateInvoice,
  deleteInvoice,
  getInvoice,
} = require("../Endpoints/invoicing");
const { Proceed } = require("../Endpoints/proceed");

let router = express.Router();

router.post("/new/invoice", Auth, draftInvoice);
router.get("/user/", Auth, userAccount);
router.get("/invoice", Auth, getInvoice);
router.post("/send/invoice", Auth, onSubscription, sendInvoice);

router.put("/invoice/updates", Auth, updateInvoice);
router.get("/dashboard", Auth, Proceed);
router.post("/sign-in", signIn);
router.post("/sign-up", signUp);

router.delete("/invoice/delete", Auth, deleteInvoice);
router.post("/client/new", Auth, addNewClient);
router.post("/account/settings", Auth, accountSettings);

exports.routes = router;
