const { db } = require("../../NOSQL/database/connection");

module.exports = class TeamService {
  static async getTeamOld(departmentCode, userAssigned, userRole, page, limit, search, order) {
    if (search) search = search.replace(/[\\]/g, "");
    const body = [
      {
        $match: {
          departmentCode: departmentCode,
          isActive: true,
          ...(search && {
            teamName: {
              $regex: new RegExp(search, "i"),
            },
          }),
        },
      },
    ];
    const remainingBody = [
      {
        $lookup: {
          from: "departments",
          let: { departmentCode: "$departmentCode", isActive: true },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: ["$departmentCode", "$$departmentCode"],
                    },
                    {
                      $eq: ["$isActive", "$$isActive"],
                    },
                  ],
                },
              },
            },
            {
              $project: { departmentCode: 1, departmentName: 1, _id: 0 },
            },
          ],
          as: "department",
        },
      },
      {
        $unwind: {
          path: "$department",
        },
      },
      {
        $lookup: {
          from: "notifications",
          let: {
            departmentCode: "$departmentCode",
            teamCode: "$teamCode",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: ["$departmentCode", "$$departmentCode"],
                    },
                    {
                      $eq: ["$teamCode", "$$teamCode"],
                    },
                  ],
                },
              },
            },
            {
              $lookup: {
                from: "worksheets",
                let: { worksheetCode: "$worksheetCode", isActive: true, notificationCode: "$notificationCode" },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $and: [
                          {
                            $eq: ["$worksheetCode", "$$worksheetCode"],
                          },
                          {
                            $eq: ["$isActive", "$$isActive"],
                          },
                        ],
                      },
                    },
                  },
                  {
                    $project: {
                      _id: 0,
                      worksheetCode: 1,
                      notificationCode: "$$notificationCode",
                    },
                  },
                  {
                    $lookup: {
                      from: "usernotifications",
                      let: { userCode: userAssigned, notificationCode: "$notificationCode", isRead: false },
                      pipeline: [
                        {
                          $match: {
                            $expr: {
                              $and: [
                                {
                                  $eq: ["$userCode", "$$userCode"],
                                },
                                {
                                  $eq: ["$notificationCode", "$$notificationCode"],
                                },
                                {
                                  $eq: ["$isRead", "$$isRead"],
                                },
                              ],
                            },
                          },
                        },
                        {
                          $count: "count",
                        },
                      ],
                      as: "userNotification",
                    },
                  },
                  {
                    $unwind: {
                      path: "$userNotification",
                      preserveNullAndEmptyArrays: true,
                    },
                  },
                  {
                    $project: {
                      userNotificationCount: "$userNotification.count",
                    },
                  },
                ],
                as: "worksheet",
              },
            },
            {
              $unwind: {
                path: "$worksheet",
              },
            },
          ],
          as: "notifications",
        },
      },
      {
        $project: {
          teamCode: "$teamCode",
          teamName: "$teamName",
          departmentCode: "$departmentCode",
          newlyAssigned: {
            $reduce: {
              input: "$notifications.worksheet.userNotificationCount",
              initialValue: 0,
              in: { $sum: ["$$value", "$$this"] },
            },
          },
        },
      },
      {
        $lookup: {
          from: "clients",
          let: {
            departmentCode: "$departmentCode",
            teamCode: "$teamCode",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: ["$departmentCode", "$$departmentCode"],
                    },
                    {
                      $eq: ["$teamCode", "$$teamCode"],
                    },
                  ],
                },
              },
            },
            {
              $project: { clientCode: 1, teamCode: 1, _id: 0 },
            },
          ],
          as: "clients",
        },
      },
      {
        $unwind: {
          path: "$clients",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 1,
          teamCode: 1,
          teamName: 1,
          newlyAssigned: 1,
          clientCode: "$clients.clientCode",
        },
      },
      {
        $group: {
          _id: "$_id",
          teamCode: { $first: "$teamCode" },
          teamName: { $first: "$teamName" },
          newlyAssigned: { $first: "$newlyAssigned" },
          clients: { $push: "$clientCode" },
        },
      },
      {
        $lookup: {
          from: "worksheets",
          let: {
            status: "IN_PROGRESS",
            userAssigned: userAssigned,
            clientCode: "$clients",
            isActive: true,
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: ["$status", "$$status"],
                    },
                    {
                      $in: ["$clientCode", "$$clientCode"],
                    },
                    {
                      ...(["ROLE_TRAINING"].includes(userRole)
                        ? {
                            $eq: ["$userAssigned", "$$userAssigned"],
                          }
                        : null),
                    },
                    {
                      $eq: ["$isActive", "$$isActive"],
                    },
                  ],
                },
              },
            },
            {
              $count: "count",
            },
          ],
          as: "inProgressworksheetCount",
        },
      },
      {
        $lookup: {
          from: "worksheets",
          let: {
            status: "COMPLETED",
            userAssigned: userAssigned,
            clientCode: "$clients",
            isActive: true,
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: ["$status", "$$status"],
                    },
                    {
                      $in: ["$clientCode", "$$clientCode"],
                    },
                    {
                      ...(["ROLE_TRAINING"].includes(userRole)
                        ? {
                            $eq: ["$userAssigned", "$$userAssigned"],
                          }
                        : null),
                    },
                    {
                      $eq: ["$isActive", "$$isActive"],
                    },
                  ],
                },
              },
            },
            {
              $count: "count",
            },
          ],
          as: "completedworksheetCount",
        },
      },
      {
        $lookup: {
          from: "worksheets",
          let: {
            userAssigned: userAssigned,
            clientCode: "$clients",
            isActive: true,
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $in: ["$clientCode", "$$clientCode"],
                    },
                    {
                      ...(["ROLE_TRAINING"].includes(userRole)
                        ? {
                            $eq: ["$userAssigned", "$$userAssigned"],
                          }
                        : null),
                    },
                    {
                      $eq: ["$isActive", "$$isActive"],
                    },
                  ],
                },
              },
            },
            {
              $count: "count",
            },
          ],
          as: "totalworksheetCount",
        },
      },
      {
        $unwind: {
          path: "$totalworksheetCount",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: "$inProgressworksheetCount",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: "$completedworksheetCount",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          worksheetCompleted: {
            $ifNull: ["$completedworksheetCount.count", 0],
          },
          worksheetInprogess: {
            $ifNull: ["$inProgressworksheetCount.count", 0],
          },
          totalWorksheets: {
            $ifNull: ["$totalworksheetCount.count", 0],
          },
        },
      },
      {
        $group: {
          _id: "$_id",
          teamCode: { $first: "$teamCode" },
          teamName: { $first: "$teamName" },
          worksheetCompleted: { $sum: "$worksheetCompleted" },
          worksheetInprogess: { $sum: "$worksheetInprogess" },
          totalWorksheets: { $sum: "$totalWorksheets" },
          newlyAssigned: { $first: "$newlyAssigned" },
        },
      },
      {
        $sort: {
          teamName: 1,
        },
      },
      {
        $project: {
          _id: 0,
          teamCode: 1,
          teamName: 1,
          worksheetCompleted: 1,
          worksheetInprogess: 1,
          totalWorksheets: 1,
          newlyAssigned: {
            $ifNull: ["$newlyAssigned", 0],
          },
        },
      },
    ];
    const pagination = page && limit ? [{ $skip: (page - 1) * limit }, { $limit: limit * 1 }] : [];
    const bodyFinal = body.concat(pagination);

    const data = await db.Team.aggregate(bodyFinal.concat(remainingBody)).collation({ locale: "en" });
    let departmentData = await db.Department.aggregate([
      {
        $match: {
          departmentCode: departmentCode,
          isActive: true,
        },
      },
      {
        $lookup: {
          from: "teams",
          let: { departmentCode: "$departmentCode", isActive: true },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: ["$departmentCode", "$$departmentCode"],
                    },
                    {
                      $eq: ["$isActive", "$$isActive"],
                    },
                  ],
                },
              },
            },
            {
              $match: {
                ...(search
                  ? {
                      teamName: {
                        $regex: new RegExp(search, "i"),
                      },
                    }
                  : null),
              },
            },
            {
              $count: "count",
            },
          ],
          as: "teamCount",
        },
      },
      {
        $unwind: {
          path: "$teamCount",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 0,
          departmentCode: "$departmentCode",
          departmentName: "$departmentName",
          teamsCount: "$teamCount.count",
        },
      },
    ]);
    let teams;
    if (data) {
      teams = {
        departmentCode: departmentData[0].departmentCode,
        departmentName: departmentData[0].departmentName,
        teams: data,
      };
    } else {
      teams = {
        departmentCode: departmentData[0].departmentCode,
        departmentName: departmentData[0].departmentName,
        teams: [],
      };
    }
    return {
      totalCount: departmentData.length ? departmentData[0].teamsCount : 0,
      count: teams ? teams.teams.length : 0,
      rows: teams,
    };
  }

  static async getTeam(departmentCode, userAssigned, userRole, page, limit, search, order) {
    if (search) search = search.replace(/[\\]/g, "");

    const teamBody = [
      {
        $match: {
          $expr: {
            $and: [
              {
                $eq: ["$departmentCode", "$$departmentCode"],
              },
              {
                $eq: ["$isActive", "$$isActive"],
              },
            ],
          },
        },
      },
      {
        $sort: {
          teamName: 1,
        },
      },
      {
        $lookup: {
          from: "notifications",
          let: {
            departmentCode: "$departmentCode",
            teamCode: "$teamCode",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: ["$departmentCode", "$$departmentCode"],
                    },
                    {
                      $eq: ["$teamCode", "$$teamCode"],
                    },
                  ],
                },
              },
            },
          ],
          as: "notifications",
        },
      },
      {
        $unwind: {
          path: "$notifications",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "worksheets",
          let: {
            worksheetCode: "$notifications.worksheetCode",
            isActive: true,
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: ["$worksheetCode", "$$worksheetCode"],
                    },
                    {
                      $eq: ["$isActive", "$$isActive"],
                    },
                  ],
                },
              },
            },
          ],
          as: "worksheet",
        },
      },
      {
        $unwind: {
          path: "$worksheet",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "usernotifications",
          let: {
            notificationCode: "$notifications.notificationCode",
            isRead: false,
            userCode: userAssigned,
            userCodeWorksheet: "$worksheet.userAssigned",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: ["$notificationCode", "$$notificationCode"],
                    },
                    {
                      $eq: ["$isRead", "$$isRead"],
                    },
                    { $eq: ["$userCode", "$$userCode"] },
                    { $eq: ["$userCode", "$$userCodeWorksheet"] },
                  ],
                },
              },
            },
            {
              $count: "count",
            },
          ],
          as: "userNotifications",
        },
      },
      {
        $unwind: {
          path: "$userNotifications",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: "$_id",
          teamCode: { $first: "$teamCode" },
          teamName: { $first: "$teamName" },
          departmentCode: { $first: "$departmentCode" },
          newlyAssigned: { $sum: "$userNotifications.count" },
        },
      },
      {
        $lookup: {
          from: "clients",
          let: {
            departmentCode: "$departmentCode",
            teamCode: "$teamCode",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: ["$departmentCode", "$$departmentCode"],
                    },
                    {
                      $eq: ["$teamCode", "$$teamCode"],
                    },
                  ],
                },
              },
            },
            {
              $project: { clientCode: 1, teamCode: 1, _id: 0 },
            },
          ],
          as: "clientsObject",
        },
      },
      {
        $unwind: {
          path: "$clientsObject",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 1,
          teamCode: 1,
          teamName: 1,
          newlyAssigned: 1,
          clientCode: "$clientsObject.clientCode",
        },
      },
      {
        $group: {
          _id: "$_id",
          teamCode: { $first: "$teamCode" },
          teamName: { $first: "$teamName" },
          newlyAssigned: { $first: "$newlyAssigned" },
          clients: { $push: "$clientCode" },
        },
      },
      {
        $lookup: {
          from: "worksheets",
          let: {
            status: "IN_PROGRESS",
            userAssigned: userAssigned,
            clientCode: "$clients",
            isActive: true,
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: ["$status", "$$status"],
                    },
                    {
                      $in: ["$clientCode", "$$clientCode"],
                    },
                    {
                      ...(["ROLE_TRAINING"].includes(userRole)
                        ? {
                            $eq: ["$userAssigned", "$$userAssigned"],
                          }
                        : null),
                    },
                    {
                      $eq: ["$isActive", "$$isActive"],
                    },
                  ],
                },
              },
            },
            {
              $count: "count",
            },
          ],
          as: "inProgressworksheetCount",
        },
      },
      {
        $lookup: {
          from: "worksheets",
          let: {
            status: "COMPLETED",
            userAssigned: userAssigned,
            clientCode: "$clients",
            isActive: true,
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: ["$status", "$$status"],
                    },
                    {
                      $in: ["$clientCode", "$$clientCode"],
                    },
                    {
                      ...(["ROLE_TRAINING"].includes(userRole)
                        ? {
                            $eq: ["$userAssigned", "$$userAssigned"],
                          }
                        : null),
                    },
                    {
                      $eq: ["$isActive", "$$isActive"],
                    },
                  ],
                },
              },
            },
            {
              $count: "count",
            },
          ],
          as: "completedworksheetCount",
        },
      },
      {
        $lookup: {
          from: "worksheets",
          let: {
            userAssigned: userAssigned,
            clientCode: "$clients",
            isActive: true,
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $in: ["$clientCode", "$$clientCode"],
                    },
                    {
                      ...(["ROLE_TRAINING"].includes(userRole)
                        ? {
                            $eq: ["$userAssigned", "$$userAssigned"],
                          }
                        : null),
                    },
                    {
                      $eq: ["$isActive", "$$isActive"],
                    },
                  ],
                },
              },
            },
            {
              $count: "count",
            },
          ],
          as: "totalworksheetCount",
        },
      },
      {
        $unwind: {
          path: "$totalworksheetCount",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: "$inProgressworksheetCount",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: "$completedworksheetCount",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: "$_id",
          teamCode: { $first: "$teamCode" },
          teamName: { $first: "$teamName" },
          worksheetCompleted: { $sum: "$completedworksheetCount.count" },
          worksheetInprogess: { $sum: "$inProgressworksheetCount.count" },
          totalWorksheets: { $sum: "$totalworksheetCount.count" },
          newlyAssigned: { $first: "$newlyAssigned" },
        },
      },
      {
        $project: {
          _id: 0,
          teamCode: 1,
          teamName: 1,
          worksheetCompleted: 1,
          worksheetInprogess: 1,
          totalWorksheets: 1,
          newlyAssigned: 1,
        },
      },
      {
        $sort: {
          teamName: 1,
        },
      },
    ];

    teamBody.splice(2, 0, ...(page && limit ? [{ $skip: (page - 1) * limit }, { $limit: limit * 1 }] : []));

    const body = [
      {
        $match: {
          isActive: true,
          // ...(["ROLE_USER", "ROLE_TRAINING", "ROLE_DEPT_ADMIN"].includes(userRole) ? { usersIn: userAssigned } : null),
          usersIn: userAssigned,
          departmentCode: departmentCode,
        },
      },
      {
        $project: {
          _id: 0,
          departmentCode: 1,
          departmentName: 1,
        },
      },
      {
        $lookup: {
          from: "teams",
          let: {
            departmentCode: "$departmentCode",
            isActive: true,
          },
          pipeline: [...teamBody],
          as: "teams",
        },
      },
    ];
    // const bodyFinal = body.concat(pagination);
    const data = await db.Department.aggregate(body).collation({ locale: "en" });

    // -----------------------------for departmentCount--------------------------------------//
    let teamCount = await db.Department.aggregate([
      {
        $match: {
          departmentCode: departmentCode,
          isActive: true,
        },
      },
      {
        $lookup: {
          from: "teams",
          let: { departmentCode: "$departmentCode", isActive: true },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: ["$departmentCode", "$$departmentCode"],
                    },
                    {
                      $eq: ["$isActive", "$$isActive"],
                    },
                  ],
                },
              },
            },
            {
              $match: {
                ...(search
                  ? {
                      teamName: {
                        $regex: new RegExp(search, "i"),
                      },
                    }
                  : null),
              },
            },
            {
              $count: "count",
            },
          ],
          as: "teamCount",
        },
      },
      {
        $unwind: {
          path: "$teamCount",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 0,
          teamsCount: "$teamCount.count",
        },
      },
    ]);

    return {
      totalCount: teamCount.length ? teamCount[0].teamsCount : 0,
      count: data[0].teams.length,
      rows: data[0],
    };
  }

  static async getTeamByKey(body) {
    return db.Team.findOne({ ...body, isActive: true });
  }

  static async find(filter) {
    return db.Team.find({ ...filter });
  }

  static async updateMany(filter, body) {
    return db.Team.updateMany({ ...filter }, { ...body });
  }
  static async bulkWrite(body) {
    return db.Team.bulkWrite(body);
  }

  static async createTeam(filter, body, option) {
    return db.Team.findOneAndUpdate({ ...filter }, { ...body }, { ...option });
  }
};
