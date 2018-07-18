const express = require('express');
const pug = require('pug');
const bodyParser = require('body-parser');
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

    res.render('selectDB', {
      results: results
    });
  })
});

app.listen(3000, () => {
  console.log("Listening...");
})