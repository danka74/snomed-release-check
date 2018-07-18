const express = require("express");
//const pug = require("pug");
const path = require("path");
const mysql = require("mysql");

const app = express();

app.set("views", path.join(__dirname, "./views"));
app.set("view engine", "pug");

const queries = [
  {
    id: 'new-concepts',
    sql: `
    SELECT hierarchies.term, count(concepts.id) AS ct FROM concepts
      JOIN transitiveclosure ON concepts.id = transitiveclosure.subtypeId
      JOIN hierarchies ON transitiveclosure.supertypeId = hierarchies.conceptId
    WHERE active = 1
      AND moduleId = 45991000052106
      AND effectiveTime = __release__
      AND id IN (SELECT id FROM concepts GROUP BY id HAVING count(*) = 1)
    GROUP BY hierarchies.conceptId, hierarchies.term
    ORDER BY hierarchies.displayOrder;`
  },
  {
    id: 'changed-concepts',
    sql: `
    SELECT count(*) AS ct FROM concepts
    WHERE moduleId = 45991000052106
      AND effectiveTime = __release__
      AND id IN (SELECT id FROM concepts GROUP BY id HAVING count(*) > 1);`
  }
];

  app.get('/query/:id/:release', (req, res) => {
    if (!req.params['release'] || !req.params['id']) {
      throw 'missing parameters';
    }
    
    const release = req.params['release'];
    const id = req.params['id'];

    var query = queries.find(e => {
      return e.id === id;
    });
    if(!query) {
      res.sendStatus(404);
      return;
    }

    query = query.sql.replace(/__release__/g, release);
    //console.log(query);

    const releaseConnection = mysql.createConnection({
      host: "10.3.24.7",
      user: "root",
      password: process.env.MYSQL_PASSWORD,
      database: "snomed_full_SE1000052_" + release
    });

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

  res.render('queries', {
    queries: queries,
    release: release
  });
});

app.listen(3000, () => {
  console.log("Listening...");
});
