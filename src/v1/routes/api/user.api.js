const express = require("express");
const { auth } = require("../../../middleware/checkAuth");
const UserController = require("../../controllers/user.controller");
const v = require("../../../middleware/validators/validator");

const router = express.Router();

router.post("/register", v.User, v.validateRequest, UserController.createUser);
router.post("/login", v.LoginUser, v.validateRequest, UserController.loginUser);
router.get("/reset-password/:userCode", auth, UserController.resetPassword);
router.put("/:userCode", auth, UserController.updateUser);
router.post("/delete/:userCode", auth, UserController.deleteUser);
router.get("/", auth, UserController.getUsers);
router.post("/change-password", auth, v.ChangePassword, v.validateRequest, UserController.changePassword);

module.exports = router;
