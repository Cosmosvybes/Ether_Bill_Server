const express = require("express");
const { signIn, signUp, userAccount } = require("../Endpoints/account");
const { Auth } = require("../../middleware/auth/Auth");
const { onSubscription } = require("../../middleware/auth/subscriptionAuth");
const {
  sendInvoice,
  draftInvoice,
  updateInvoice,
} = require("../Endpoints/invoicing");
const { Proceed } = require("../Endpoints/proceed");

let router = express.Router();

router.post("/new/invoice", Auth, draftInvoice);
router.get("/user/", Auth, userAccount);
router.post("/send/invoice", Auth, onSubscription, sendInvoice);

router.put("/invoice/updates", Auth, updateInvoice);
router.get("/dashboard", Auth, Proceed);
router.post("/sign-in", signIn);
router.post("/sign-up", signUp);

router.delete("/invoice/delete/:id");
router.post("/client/new");

exports.routes = router;
