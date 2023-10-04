/* eslint-disable no-console */
const mongoose = require("mongoose");
const config = require("../../../config/config");

mongoose.set("strictQuery", false);

const db = require("./mongodb");

mongoose
  .connect(config.NOSQL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("\n>> Connected to Database\n");
  })
  .catch((err) => {
    console.log("Connection Failed", err);
  });

module.exports = {
  mongoose,
  db,
};
