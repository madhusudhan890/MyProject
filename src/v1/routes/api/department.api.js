const express = require("express");
const { auth,auth1, authBeta } = require("../../../middleware/checkAuth");
const v = require("../../../middleware/validators/validator");
const DepartmentController = require("../../controllers/department.controller");

const router = express.Router();

router.get("/list",auth, DepartmentController.getDepartments);

module.exports = router;
