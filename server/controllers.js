'use strict';

function * indexController() {
	this.body = yield this.render('layout');
}

module.exports.indexController = indexController;
