const express = require("express");
const pug = require("pug");
const path = require("path");
const mysql = require("mysql");
const util = require("util");

const app = express();

app.set("views", path.join(__dirname, "./views"));
app.set("view engine", "pug");

const queries = [
  {
    path: 'new-concept',
    sql: `
  SELECT hierarchies.term, count(concepts.id) AS ct FROM concepts
    JOIN transitiveclosure ON concepts.id = transitiveclosure.subtypeId
    JOIN hierarchies ON transitiveclosure.supertypeId = hierarchies.conceptId
  WHERE active = 1
    AND moduleId = 45991000052106
    AND effectiveTime = __release__
    AND id IN (SELECT id FROM snomed_full_SE1000052___release__.concepts GROUP BY id HAVING count(*) = 1)
  GROUP BY hierarchies.conceptId, hierarchies.term
  ORDER BY hierarchies.displayOrder;
  `
  }
];

  app.get('/query/:id/:release', (req, res) => {
    if (!req.params['release'] || !req.params['id']) {
      throw 'no release selected';
    }
    
    const release = req.params['release'];
    const id = req.params['id'];

    const releaseConnection = mysql.createConnection({
      host: "10.3.24.7",
      user: "root",
      password: process.env.MYSQL_PASSWORD,
      database: "snomed_full_SE1000052_" + release
    });

    const query = queries.find(e => {
      return e.path === id;
    }).sql.replace(/__release__/g, release);
    console.log(query);

    releaseConnection.query(query, (err, results, fields) => {
      if (err) {
        throw err;
      }
  
      res.render(id, {
        release: release,
        results: results
      });
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

app.get("/check-release", (req, res) => {
  if (!req.query["release"]) {
    throw "no release selected";
  }

  const release = req.query["release"];

  const releaseConnection = mysql.createConnection({
    host: "10.3.24.7",
    user: "root",
    password: process.env.MYSQL_PASSWORD,
    database: "snomed_full_SE1000052_" + release
  });

  const query =
    `
  SELECT hierarchies.term, count(concepts.id) AS ct FROM concepts
    JOIN transitiveclosure ON concepts.id = transitiveclosure.subtypeId
    JOIN hierarchies ON transitiveclosure.supertypeId = hierarchies.conceptId
  WHERE active = 1
    AND moduleId = 45991000052106
    AND effectiveTime = ` +
    release +
    `
    AND id IN (SELECT id FROM snomed_full_SE1000052_20180531.concepts GROUP BY id HAVING count(*) = 1)
  GROUP BY hierarchies.conceptId, hierarchies.term
  ORDER BY hierarchies.displayOrder;
  `;

  releaseConnection.query(query, (err, results, fields) => {
    if (err) {
      throw err;
    }

    res.render("new-concepts", {
      release: req.query["release"],
      results: results
    });
  });

  releaseConnection.end();
});

app.listen(3000, () => {
  console.log("Listening...");
});
