const { OK, ERROR } = require("../../../utils/responseHelper");
const TeamService = require("../services/department-teams.service");

module.exports = class DepartmentController {
  static async getTeams(req, res) {
    try {
      const userCode = req.payload.userCode;
      const userRole = req.payload.role;
      const departmentCode = req.query.departmentCode;
      const page = req.query.page; //? req.query.page : 1;
      const limit = req.query.limit; //? req.query.limit : 20;
      let search;
      if (req.query.search) search = req.query.search;
      const order = req.query.order ? req.query.order : null;
      const data = await TeamService.getTeam(departmentCode, userCode, userRole, page, limit, search, order);
      return OK(res, data, "Team data fetched successfully");
    } catch (error) {
      return ERROR(res, { error }, error.message || "Something went Wrong");
    }
  }
};
