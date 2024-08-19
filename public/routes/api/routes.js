const express = require("express");
const { signUp, signIn } = require("./account");
const { Auth } = require("../../middleware/auth/Auth");

let router = express.Router();

router.post("/new/invoice", Auth, (req, res) => {
  console.log("add invoice");
});
router.put("/api/invoice/edit/:id");

router.post("/sign-in", signIn);
router.post("/sign-up", signUp);

router.delete("/invoice/delete/:id");
router.post("/client/new");
exports.routes = router;
