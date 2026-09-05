const { isValidObjectId } = require("../utils/validation");

function validateObjectId(paramName, label = paramName) {
  return (req, res, next) => {
    if (!isValidObjectId(req.params[paramName])) {
      return res.status(400).json({
        message: `Invalid ${label} ID`,
      });
    }

    next();
  };
}

module.exports = validateObjectId;
