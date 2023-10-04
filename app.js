const express = require("express");
const path = require("path");
require("dotenv").config();

global.__basedir = __dirname;

const app = express();

// DATABASE CONNECTION
require("./src/NOSQL/database/connection");

const api = require("./src/v1/routes/api");

app.use(cors());

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(compression());

app.use("/health", (req, res) => {
  res.status(200).json({
    code: false,
    message: "OK: Working",
  });
});

app.use("/v1/api/", api);

module.exports = app;
