const express = require("express");
const pug = require("pug");
const path = require("path");
const mysql = require("mysql");

const app = express();

app.set("views", path.join(__dirname, "./views"));
app.set("view engine", "pug");

const queries = require("./queries");

// specific queries (id, used to identify queries) for a specific release, possibly with a parameter
app.get("/query/:id/:release/:prmtr?", (req, res) => {
  const release = req.params["release"];
  const id = req.params["id"];
  const param = req.params["prmtr"];

  if (!release || !id) {
    res.status(400).send("Release and id needs to be specified");
    return;
  }

  // find the query object correspondning to the id
  const query = queries.find(e => {
    return e.id === id;
  });

  // if the query id could not be found
  if (!query) {
    res.status(404).send("Cannot find query id");
    return;
  }

  // insert release date into SQL query
  var sqlQuery = query.sql.replace(/__release__/g, release);

  // if the SQL query has a parameter, replace that with the input parameter
  if (sqlQuery.indexOf("__param__") != -1) {
    if (!param) {
      res.status(400).send("Missing parameter");
      return;
    }
    sqlQuery = sqlQuery.replace(/__pararm__/g, param);
  }

  //console.log(query);

  const releaseConnection = mysql.createConnection({
    host: "10.3.24.7",
    user: "root",
    password: process.env.MYSQL_PASSWORD,
    database: release
  });

  releaseConnection.query(sqlQuery, (err, results, fields) => {
    if (err) {
      throw err;
    }

    // if client accepts HTML, send HTML
    if (req.accepts("text/html")) {
      // if the query object contains pug template, use that for rendering, otherwise use a file with the same name as the id
      if (query.pug) {
        res.send(
          pug.render(query.pug, {
            queryId: id,
            release: release,
            parameter: param ? param : null,
            results: results
          })
        );
      } else {
        res.render(id, {
          queryId: id,
          release: release,
          parameter: param ? param : null,
          results: results
        });
      }
      return;
    }

    // if client accepts JSON then send JSON
    if (req.accepts("application/json")) {
      res.json({
        queryId: id,
        release: release,
        parameter: param ? param : null,
        results: results
      });
      return;
    }

    res.status(405).send('Only text/html and application/json allowed');
  });

  releaseConnection.end();
});

// start page, select release
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
      .filter(db => db.Database.startsWith("snomed_full_") || db.Database.startsWith("xsnomed_full_"))
      .map(db => db.Database);

    res.render("select-db", {
      results: results
    });
  });

  startConnection.end();
});

// show list of queries available
app.get("/check-release/:release", (req, res) => {
  const release = req.params["release"];

  if (!release) {
    res.status(400).send("Release needs to be specified");
    return;
  }

  res.render("queries", {
    queries: queries,
    release: release
  });
});

app.get("/all-queries/:release", (req, res) => {
  const release = req.params["release"];

  if (!release) {
    res.status(400).send("Release needs to be specified");
    return;
  }

  res.render("all-queries", {
    queries: queries.filter(q => {
      return q.sql.indexOf("__param__") == -1;
    }), // only queries without paramaters are meaningful here
    release: release
  });
});

app.listen(3000, () => {
  console.log("Listening...");
});
