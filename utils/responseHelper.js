exports.OK = (res, result, message = "", code = true) => {
  res.status(200).json({
    code,
    message: message || "",
    result: result || null,
  });
};

exports.ERROR = (res, result, message = "Error", code = false) => {
  res.status(400).json({
    code,
    message: message || "",
    result,
  });
};

exports.UNAUTHORIZED = (res, result, message = "Error", code = false) => {
  res.status(401).json({
    code,
    message: message || "",
    result,
  });
};

exports.BAD = (res, result, message = "Error", code = false) => {
  res.status(400).json({
    code,
    result,
    message: message || "",
  });
};

exports.UNKNOWN = (res, result, message = "Error", code = false) => {
  res.status(500).json({
    code,
    result,
    message: message || "",
  });
};

exports.RESPONSE = ({ res, statusCode = 200, status = true, message = "", result = null }) => {
  res.status(statusCode).json({
    statusCode,
    status,
    message: message || "",
    result,
  });
};

exports.RESPONSE_ERROR = ({ res, statusCode = 500, status = false, message = "Oops, Something went wrong" }) => {
  res.status(statusCode).json({
    statusCode,
    status,
    message: message || "",
  });
};
