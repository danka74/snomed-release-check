const express = require('express');
const pug = require('pug');
const path = require('path');
const mysql = require('mysql');
const util = require('util');

const app = express();

app.set('views', path.join(__dirname, './views'));
app.set('view engine', 'pug');

app.get('/', (req, res) => {
  const startConnection = mysql.createConnection({
    host: '10.3.24.7',
    user: 'root',
    password: process.env.MYSQL_PASSWORD,
    database: 'information_schema'
  });

  startConnection.query('show databases;', (err, results, fields) => {
    if(err) {
      throw err;
    }

    results = results
      .filter(db => db.Database.startsWith('snomed_full'))
      .map(db => db.Database.substr(db.Database.lastIndexOf('_') + 1));

    res.render('selectDB', {
      results: results
    });
  })
});

app.get('/check-release', (req, res) => {
  if (!req.query.['release']) {
    throw 'no release selected';
  }

  const releaseConnection = mysql.createConnection({
    host: '10.3.24.7',
    user: 'root',
    password: process.env.MYSQL_PASSWORD,
    database: 'snomed_full_SE1000052_' + req.query['release']
  });

  releaseConnection.query(`
    SELECT hierarchies.term, count(concepts.id) AS ct FROM concepts
      JOIN transitiveclosure ON concepts.id = transitiveclosure.subtypeId
      JOIN hierarchies ON transitiveclosure.supertypeId = hierarchies.conceptId
    WHERE active = 1
      AND moduleId = 45991000052106
      AND effectiveTime = 20180531
      AND id IN (SELECT id FROM snomed_full_SE1000052_20180531.concepts GROUP BY id HAVING count(*) = 1)
    GROUP BY hierarchies.conceptId, hierarchies.term
    ORDER BY hierarchies.displayOrder;`, (err, results, fields) => {

      if(err) {
        throw err;
      }

      res.render('genReleaseNotes', {
        release: req.query['release'],
        results: results
      });
  });

})

app.listen(3000, () => {
  console.log("Listening...");
})