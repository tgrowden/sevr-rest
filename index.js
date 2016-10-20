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

// module.exports = (ichabod, _config) => {
// 	const config = _.merge({}, defaultConfig, _config)
// 	const controller = new Controller(ichabod.factory, ichabod.authentication)
// 	const server = ichabod.server
// 	const apiServer = express()

// 	ichabod.events.on('db-ready', () => {
// 		bindMiddleware(controller.middleware, apiServer)
// 		server.use(config.basePath, apiServer)
// 	})
// }

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
