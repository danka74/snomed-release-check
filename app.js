const express = require('express');
const pug = require('pug');
const bodyParser = require('body-parser');
const path = require('path');
const mysql = require('mysql');

const app = express();

app.set('views', path.join(__dirname, './views'));
app.set('view engine', 'pug');
