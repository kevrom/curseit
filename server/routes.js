'use strict';

var Router = require('koa-router');
var r = new Router();
var c = require('./controllers');

r.get('/', c.indexController);

module.exports = r;
