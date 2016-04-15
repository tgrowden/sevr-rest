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

module.exports = (ichabod, _config) => {
	const config = _.merge({}, defaultConfig, _config)
	const controller = new Controller(ichabod.factory)
	const server = ichabod.server
	const apiServer = express()

	bindMiddleware(controller.middleware, apiServer)
	server.use(config.basePath, apiServer)
}

const bindMiddleware = (middleware, app) => {
	middleware.forEach(item => {
		app[item.method](item.path, item.callback)
	})
}
