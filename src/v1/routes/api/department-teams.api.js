const express = require("express");
const { auth, authBeta } = require("../../../middleware/checkAuth");
const v = require("../../../middleware/validators/validator");
const TeamController = require("../../controllers/department-teams.controller");
const CheckFunctions = require("../../functions/userPrivilege.check");
const router = express.Router();

router.get(
  "/list",
  auth,
  v.GetTeams,
  v.validateRequest,
  CheckFunctions.checkTeamByDepartmentCode,
  TeamController.getTeams
);

module.exports = router;
