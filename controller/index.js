'use strict'

const bodyParser = require('body-parser')
const Collection = require('sevr/collection')
const paths      = require('../paths')

class Controller {
	constructor(factory, authentication) {
		this._collectionFactory = factory
		this._authentication = authentication
	}

	/**
	 * Get the controller middleware
	 * @return {Array}
	 */
	get middleware() {
		return [].concat(
			this._getGlobalMiddleware(),
			this._authentication.isEnabled ? this._getAuthMiddleware() : [],
			this._getParameterMiddleware(),
			this._getRoutes(),
			this._getResponseMiddleware()
		)
	}

	/**
	 * Get the global middleware
	 * @return {Array}
	 * @private
	 */
	_getGlobalMiddleware() {
		return [
			{ method: 'use', path: '/', callback: bodyParser.urlencoded({ extended: false }) },
			{ method: 'use', path: '/', callback: bodyParser.json() }
		]
	}

	/**
	 * Get the authentication middleware
	 * @return {Array}
	 * @private
	 */
	_getAuthMiddleware() {
		return [
			{ name: 'auth',  method: 'use', path: '/',      callback: this._authorizeRequest.bind(this) },
			{ name: 'token', method: 'get', path: '/token', callback: this._getToken.bind(this) }
		]
	}

	/**
	 * Get the parameter capture middleware
	 * @return {Array}
	 * @private
	 */
	_getParameterMiddleware() {
		return [
			{ name: 'param.coll',  method: 'param', path: 'coll',  callback: this._attachCollectionToRequest.bind(this) },
			{ name: 'param.id',    method: 'param', path: 'id',    callback: this._attachIdToRequest.bind(this) },
			{ name: 'param.field', method: 'param', path: 'field', callback: this._attachFieldToRequest.bind(this) }
		]
	}

	/**
	 * Get the routes
	 * @return {Array}
	 * @private
	 */
	_getRoutes() {
		return [
			// Definition REST routes
			{ name: 'route.definition', method: 'get', path: paths.DEFINITION, callback: this._restDefine.bind(this) },

			// Collection REST routes
			{ name: 'route.read.collection',   method: 'get',    path: paths.COLLECTION, callback: this._restReadCollection.bind(this) },
			{ name: 'route.read.document',     method: 'get',    path: paths.DOCUMENT,   callback: this._restRead.bind(this) },
			{ name: 'route.read.field',        method: 'get',    path: paths.FIELD,      callback: this._restRead.bind(this) },
			{ name: 'route.create.collection', method: 'post',   path: paths.COLLECTION, callback: this._restCreate.bind(this) },
			{ name: 'route.update.collection', method: 'put',    path: paths.COLLECTION, callback: this._restUpdateCollection.bind(this) },
			{ name: 'route.update.document',   method: 'put',    path: paths.DOCUMENT,   callback: this._restUpdate.bind(this) },
			{ name: 'route.delete.collection', method: 'delete', path: paths.COLLECTION, callback: this._restDelCollection.bind(this) },
			{ name: 'route.delete.document',   method: 'delete', path: paths.DOCUMENT,   callback: this._restDel.bind(this) }
		]
	}

	/**
	 * Get the response middleware
	 * @return {Array}
	 * @private
	 */
	_getResponseMiddleware() {
		return [
			// Success and error middleware
			{ name: 'response.success', method: 'use', path: '/', callback: this._successHandler.bind(this) },
			{ name: 'response.error',   method: 'use', path: '/', callback: this._errorHandler.bind(this) }
		]
	}

	/**
	 * Get a link to a colletion definition
	 * @param   {String} collectionName
	 * @returns {String}
	 */
	getDefinitionLink(collectionName) {
		return paths.DEFINITION.replace(':coll?', collectionName)
	}

	/**
	 * Authorization middleware
	 * @param  {Object}   req
	 * @param  {Object}   res
	 * @param  {Function} next
	 */
	_authorizeRequest(req, res, next) {
		const auth = req.get('authorization')
		let type
		let authValue

		try {
			type = /(Basic|Bearer)\s+.*/.exec(auth)[1]
			authValue = auth.replace(/Basic|Bearer\s+/, '')
		} catch (err) {
			res.status(400)
			return next({
				name: 'Bad Request',
				message: '400 Bad Request'
			})
		}

		if (!type) {
			res.status(400)
			return next({
				name: 'Bad Request',
				message: '400 Bad Request'
			})
		}

		if (type === 'Basic') {
			const creds = new Buffer(authValue, 'base64').toString().split(':')
			this._authentication.validateCredentials({
				username: creds[0],
				password: creds[1]
			})
			.then(user => {
				req.user = user
				next()
			})
			.catch(() => {
				res.status(401)
				next({
					name: 'Unauthorized',
					message: '401 Unauthorized'
				})
			})
		} else {
			this._authentication.verifyToken(authValue)
				.then(user => {
					req.user = user
					next()
				})
				.catch(err => {
					res.status(401)
					next(err)
				})
		}
	}

	/**
	 * Handle requests for collection and add the collection
	 * to the request if exists. Send 404 otherwise
	 * @param {Objcct}   req
	 * @param {Objcct}   res
	 * @param {Function} next
	 * @param {String}   coll
	 * @private
	 */
	_attachCollectionToRequest(req, res, next, coll) {
		let err = null
		const instance = this._collectionFactory.getInstance(coll)

		if (instance) {
			req.collection = instance
		} else {
			res.status(404)
			err = new Error(`Could not find collection ${coll}`)
		}

		next(err)
	}

	/**
	 * Handle requests for a single document and add the document ID
	 * to the request object. Sends a 400 if the ID cannot be cast to
	 * an ObjectId
	 * @param {Objcct}   req
	 * @param {Objcct}   res
	 * @param {Function} next
	 * @param {String}   id
	 * @private
	 */
	_attachIdToRequest(req, res, next, id) {
		try {
			req.documentId = id
			next()
		} catch (err) {
			res.status(400)
			next(err)
		}
	}

	/**
	 * Handle requests for a document field and add the field name
	 * to the request object. Sends a 404 if the document schema
	 * does not contain the requested field.
	 * @param {Objcct}   req
	 * @param {Objcct}   res
	 * @param {Function} next
	 * @param {String}   field
	 * @private
	 */
	_attachFieldToRequest(req, res, next, field) {
		const collFields = req.collection.getFields()
		let err = null

		if (!collFields.hasOwnProperty(field)) {
			res.status(404)
			err = new Error(`Could not find field ${field}`)
		} else {
			req.field = field
		}

		next(err)
	}

	/**
	 * Handle errors in the response
	 * @param {Error}    err
	 * @param {Objcct}   req
	 * @param {Objcct}   res
	 * @param {Function} next
	 * @private
	 */
	_errorHandler(err, req, res, next) {
		let resData = res.data || {}

		res.send(
			Object.assign({}, resData, {
				status: 'fail',
				code: res.statusCode,
				message: (err instanceof Error ? err.message : err),
				data: (err.name ? err.name : 'Error')
			})
		)

		next(err)
	}

	/**
	 * Handle a successful response
	 * @param {Objcct}   req
	 * @param {Objcct}   res
	 * @param {Function} next
	 * @private
	 */
	_successHandler(req, res, next) {
		let resData = res.data || {}

		res.send(
			Object.assign({}, resData, {
				status: 'success',
				code: res.statusCode
			})
		)

		next()
	}

	/**
	 * Handle REST request to get authorization token
	 * @param {Object}   req
	 * @param {Object}   res
	 * @param {Function} next
	 * @private
	 */
	_getToken(req, res, next) {
		this._authentication.createToken(req.user)
			.then(token => {
				res.data = { token: token }
				next()
			})
			.catch(next)
	}

	/**
	 * Handle REST request to read collections
	 * @param {Object}   req
	 * @param {Object}   res
	 * @param {Function} next
	 * @private
	 */
	_restReadCollection(req, res, next) {
		const coll = req.collection
		const query = req.query

		coll.read(query, null, true)
			.then(docs => {
				res.data = {
					query: query,
					data: docs
				}
				next()
			}, err => {
				res.status(500)
				res.data = {
					query: query
				}
				next(err)
			})
	}

	/**
	 * Handle REST request to read a document
	 * @param {Object}   req
	 * @param {Object}   res
	 * @param {Function} next
	 * @private
	 */
	_restRead(req, res, next) {
		const coll = req.collection
		const id = req.documentId
		const field = req.field

		coll.readById(id, field, true)
			.then(doc => {
				if (doc) {
					res.data = { data: field ? doc[field] : doc }
					next()
				} else {
					res.status(404)
					next(new Error(`Could not find document with id ${id}`))
				}
			}, err => {
				res.status(500)
				next(err)
			})
	}

	/**
	 * Handle REST request to crete a new document
	 * @param {Object}   req
	 * @param {Object}   res
	 * @param {Function} next
	 * @private
	 */
	_restCreate(req, res, next) {
		const coll = req.collection
		const docData = req.body

		coll.create(docData)
			.then(doc => {
				res.data = {
					data: doc
				}
				res.status(201)
				next()
			}, err => {
				res.status(400)
				next(err)
			})
	}

	/**
	 * Handle REST request to update collection
	 * @param {Object}   req
	 * @param {Object}   res
	 * @param {Function} next
	 * @private
	 */
	_restUpdateCollection(req, res, next) {
		const coll = req.collection
		const newDocs = req.body

		coll.update(newDocs)
			.then(docs => {
				res.data = {
					data: docs
				}
				next()
			}, err => {
				res.status(400)
				next(err)
			})
	}

	/**
	 * Handle REST request to update a document
	 * @param {Object}   req
	 * @param {Object}   res
	 * @param {Function} next
	 * @private
	 */
	_restUpdate(req, res, next) {
		const coll = req.collection
		const docData = req.body
		const id = req.documentId

		coll.updateById(id, docData)
			.then(doc => {
				res.data = {
					data: doc
				}
				next()
			}, err => {
				res.status(400)
				next(err)
			})
	}

	/**
	 * Handle REST request to delete a collection
	 * @param {Object}   req
	 * @param {Object}   res
	 * @param {Function} next
	 * @private
	 */
	_restDelCollection(req, res, next) {
		const coll = req.collection

		coll.del()
			.then(() => {
				next()
			}, err => {
				res.status(500)
				next(err)
			})
	}

	/**
	 * Handle REST request to delete a document
	 * @param {Object}   req
	 * @param {Object}   res
	 * @param {Function} next
	 * @private
	 */
	_restDel(req, res, next) {
		const coll = req.collection
		const id = req.documentId

		coll.delById(id)
			.then(doc => {
				if (doc) {
					res.data = {
						data: doc
					}
					next()
				} else {
					res.status(404)
					next(new Error(`Could not find document with id ${id}`))
				}
			}, err => {
				res.status(500)
				next(err)
			})
	}

	/**
	 * Handle REST request for collection definition
	 * 
	 * If no collection is found in `req`, all definitions
	 * will be returned
	 * 
	 * @param {Object}   req
	 * @param {Object}   res
	 * @param {Function} next
	 * @private
	 */
	_restDefine(req, res, next) {
		if (!req.collection) {
			const data = Object.keys(this._collectionFactory.collections).map(c => {
				const coll = this._collectionFactory.collections[c]

				return Object.assign({}, this._getCollectionDef(coll), {
					name: c
				})
			})

			res.data = { data}
			next()
		} else {
			res.data = this._getCollectionDef(req.collection)
			next()
		}
	}

	/**
	 * Get the collection definition object for a collection
	 * @param {Collection} coll
	 * @return {Object}
	 * @private
	 */
	_getCollectionDef(coll) {
		const fields = coll.getFields()
		const fieldsObj = Object.keys(fields).reduce((prev, key) => {
			const f = fields[key]
			const { label, name, schemaType } = f

			return Object.assign({}, prev, {
				[key]: { label, name, schemaType }
			})
		}, {})

		return {
			data: {
				name: coll.name,
				modelName: coll.modelName,
				fields: fieldsObj
			},
			links: {
				fields: coll.populationFields.reduce((prev, f) => {
					let fieldDef = fields[f]
					let fieldRef = Collection.getFieldRef(fieldDef)
					let refColl = this._collectionFactory.getInstanceWithModel(fieldRef)

					return Object.assign({}, prev, {
						[f]: this.getDefinitionLink(refColl.name)
					})
				}, {})
			}
		}
	}
}

module.exports = Controller
