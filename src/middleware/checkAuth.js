const { verify } = require("jsonwebtoken");
const { UNAUTHORIZED, RESPONSE_ERROR, RESPONSE } = require("../../utils/responseHelper");

exports.auth = async (req, res, next) => {
  try {
    req.payload = verify(req.headers.authorization.split(" ")[1], process.env.SECRET);

    return next();
  } catch (error) {
    return UNAUTHORIZED(res, [], "Token Not Verified");
  }
};
