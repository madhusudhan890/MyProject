const { OK, ERROR } = require("../../../utils/responseHelper");
const DepartmentService = require("../services/department.service");

module.exports = class DepartmentController {
  static async getDepartments(req, res) {
    try {
      const userAssigned = req.payload.userCode;
      const userRole = req.payload.role;
      const page = req.query.page; //? req.query.page : 1;
      const limit = req.query.limit; //? req.query.limit : 20;
      let search;
      if (req.query.search) search = req.query.search;
      const order = req.query.order ? req.query.order : null;
      const data = await DepartmentService.getDepartment(userAssigned, userRole, page, limit, search, order);
      return OK(res, data, "Department data fetched successfully");
    } catch (error) {
      return ERROR(res, { error }, error.message || "Something went Wrong");
    }
  }
};
