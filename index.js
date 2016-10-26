'use strict'

/**
 * Ichabod REST API
 * ---
 * Plugin for the Ichabod CMS Framework that provides
 * a RESTful API.
 */

const _             = require('lodash')
const express       = require('express')
const Controller    = require('./controller')
const defaultConfig = require('./default-config')

class SevrRest {
	constructor(sevr, config) {
		this.sevr = sevr
		this.config = _.merge({}, defaultConfig, config)
	}

	run() {
		const controller = new Controller(this.sevr.factory, this.sevr.authentication)
		const server = this.sevr.server
		const apiServer = express()

		bindMiddleware(controller.middleware, apiServer)
		server.use(this.config.basePath, apiServer)
	}
}

module.exports = SevrRest

const bindMiddleware = (middleware, app) => {
	middleware.forEach(item => {
		app[item.method](item.path, item.callback)
	})
}
