const { db } = require("../../NOSQL/database/connection");

module.exports = class UserService {
  static async checkUser(email) {
    return db.User.findOne({ email });
  }

  static async getAllUsers(body, filter) {
    return db.User.find({ ...body }, { ...filter });
  }

  static async getUserByKey(body) {
    return db.User.findOne({ ...body });
  }

  static async getUser(body, { page = 1, limit = 10, order } = {}) {
    const users = await db.User.find({ ...body })
      .sort({ ...order })
      .skip(page > 0 ? (page - 1) * limit : 0)
      .limit(limit)
      .lean();

    return { totalCount: await db.User.count({ ...body }), count: users.length, rows: users };
  }

  static async createUser(filter, body, option) {
    return db.User.findOneAndUpdate({ ...filter }, { ...body }, { ...option });
  }

  static async updateUserOne(filter, body) {
    return db.User.findOneAndUpdate({ ...filter }, { ...body });
  }
};
