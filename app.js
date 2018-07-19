const express = require("express");
const pug = require("pug");
const path = require("path");
const mysql = require("mysql");

const app = express();

app.set("views", path.join(__dirname, "./views"));
app.set("view engine", "pug");

const queries = require("./queries");

app.get("/query/:id/:release", (req, res) => {
  if (!req.params["release"] || !req.params["id"]) {
    throw "missing parameters";
  }

  const release = req.params["release"];
  const id = req.params["id"];

  const query = queries.find(e => {
    return e.id === id;
  });

  if (!query) {
    res.sendStatus(404);
    return;
  }

  const sqlQuery = query.sql.replace(/__release__/g, release);
  //console.log(query);

  const releaseConnection = mysql.createConnection({
    host: "10.3.24.7",
    user: "root",
    password: process.env.MYSQL_PASSWORD,
    database: "snomed_full_SE1000052_" + release // TODO: here the Swedish extension ID is hardcoded!
  });

  releaseConnection.query(sqlQuery, (err, results, fields) => {
    if (err) {
      throw err;
    }

    if (query.pug) {
      res.send(pug.render(query.pug, {
        release: release,
        results: results
      }));
    } else {
      res.render(id, {
        release: release,
        results: results
      });
    }
  });

  releaseConnection.end();
});

app.get("/", (req, res) => {
  const startConnection = mysql.createConnection({
    host: "10.3.24.7",
    user: "root",
    password: process.env.MYSQL_PASSWORD,
    database: "information_schema"
  });

  startConnection.query("show databases;", (err, results, fields) => {
    if (err) {
      throw err;
    }

    results = results
      .filter(db => db.Database.startsWith("snomed_full"))
      .map(db => db.Database.substr(db.Database.lastIndexOf("_") + 1));

    res.render("select-db", {
      results: results
    });
  });

  startConnection.end();
});

app.get("/check-release/:release", (req, res) => {
  const release = req.params["release"];

  if (!release) {
    throw "no release selected";
  }

  res.render("queries", {
    queries: queries,
    release: release
  });
});

app.get("/test1", (req, res) => {
  res.send(
    pug.render(
      `html
    body
      h1 #{test1}`,
      {
        test1: "hejsan"
      }
    )
  );
});

app.listen(3000, () => {
  console.log("Listening...");
});
