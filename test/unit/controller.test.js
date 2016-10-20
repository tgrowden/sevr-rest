/*eslint-env node, mocha */
'use strict'

const chai              = require('chai')
const chaiAsPromised    = require('chai-as-promised')
const mongoose          = require('mongoose')
const Controller        = require('../../controller')
const CollectionFactory = require('sevr/collection-factory')
const collectionDefs    = require('../fixtures/collections')
const ResponseMock      = require('../mocks/response')

const expect = chai.expect
const connection = {
	host: 'localhost',
	port: 27017,
	database: 'ichabod-rest-test'
}

chai.use(chaiAsPromised)

describe('Controller', function() {

	let ids = [
		new mongoose.Types.ObjectId(),
		new mongoose.Types.ObjectId()
	]
	let factory
	let postsCollection
	let usersCollection

	before(function(done) {
		mongoose.connect(`mongodb://${connection.host}:${connection.port}/${connection.database}`)

		mongoose.connection.once('open', () => {
			factory = new CollectionFactory(collectionDefs, mongoose.connection)
			postsCollection = factory.getInstance('posts')
			usersCollection = factory.getInstance('users')

			usersCollection.model.create([
				{
					_id: ids[0],
					username: 'testDoc',
					email: 'test@doc.com'
				},
				{
					_id: ids[1],
					username: 'johndoe',
					email: 'jdoe@gmail.com'
				}
			]).then(() => { done() }).catch(done)
		})
	})

	after(function() {
		mongoose.connection.db.dropDatabase()
		mongoose.connection.close()
		CollectionFactory._destroy()
	})

	describe('getDefinitionLink', function() {
		let controller

		before(function() {
			controller = new Controller(factory)
		})

		it('should return the path to a collection definition endpoint', function() {
			expect(controller.getDefinitionLink('posts')).to.equal('/definitions/posts')
		})
	})

	describe('_attachCollectionToRequest', function() {
		let controller

		before(function() {
			controller = new Controller(factory)
		})

		it('should add the collection to the request', function(done) {
			const req = {}
			const res = new ResponseMock()

			controller._attachCollectionToRequest(req, res, function() {
				expect(req).to.have.deep.property('collection', postsCollection)
				done()
			}, 'posts')
		})

		it('should return a 404 when no collection', function(done) {
			const req = {
				params: { coll: 'jobs' }
			}
			const res = new ResponseMock()

			controller._attachCollectionToRequest(req, res, function() {
				expect(res.statusSent).to.equal(404)
				done()
			})
		})
	})

	describe('_errorHandler', function() {
		let controller

		before(function() {
			controller = new Controller(factory)
		})

		it('should send an object', function(done) {
			const err = { name: 'Test error', message: 'There is an error' }
			const req = {}
			const res = new ResponseMock()

			res.statusCode = 500

			controller._errorHandler(err, req, res, function() {
				expect(res.dataSent).to.eql({
					data: 'Test error',
					message: { name: 'Test error', message: 'There is an error' },
					status: 'fail',
					code: 500
				})
				done()
			})
		})

		it('should extend the response data', function(done) {
			const err = { name: 'Test error', message: 'There is an error' }
			const req = {}
			const res = new ResponseMock()
			res.data = { foo: 'bar' }

			res.statusCode = 500

			controller._errorHandler(err, req, res, function() {
				expect(res.dataSent).to.eql({
					data: 'Test error',
					message: { name: 'Test error', message: 'There is an error' },
					status: 'fail',
					code: 500,
					foo: 'bar'
				})
				done()
			})
		})

		it('uses `err` as message and "Error" for data when `err` is not an instance of Error', function(done) {
			const err = 'Test error'
			const req = {}
			const res = new ResponseMock()

			res.statusCode = 500

			controller._errorHandler(err, req, res, function() {
				expect(res.dataSent).to.eql({
					data: 'Error',
					message: 'Test error',
					status: 'fail',
					code: 500
				})
				done()
			})
		})
	})

	describe('_successHandler', function() {
		let controller

		before(function() {
			controller = new Controller(factory)
		})

		it('should send an object', function(done) {
			const req = {}
			const res = new ResponseMock()

			controller._successHandler(req, res, function() {
				expect(res.dataSent).to.eql({
					status: 'success',
					code: 200
				})
				done()
			})
		})

		it('should extend the response data', function(done) {
			const req = {}
			const res = new ResponseMock()
			res.data = { foo: 'bar' }

			controller._successHandler(req, res, function() {
				expect(res.dataSent).to.eql({
					status: 'success',
					code: 200,
					foo: 'bar'
				})
				done()
			})
		})

	})

	describe('_restReadCollection', function() {
		let controller

		before(function(done) {
			controller = new Controller(factory)

			postsCollection.model.create([
				{
					title: 'Read1',
					author: ids[0]
				},
				{
					title: 'Read2',
					author: ids[0]
				}
			], (err) => {
				done(err)
			})
		})

		after(function() {
			mongoose.connection.db.dropCollection('posts')
		})

		it('should set a 200 status if successful', function(done) {
			const res = new ResponseMock()
			const req = {
				collection: postsCollection,
				query: {}
			}

			controller._restReadCollection(req, res, function() {
				expect(res.statusSent).to.equal(200)
				done()
			})
		})

		it('should add all matching collections to response data if successful', function(done) {
			const res = new ResponseMock()
			const req = {
				collection: postsCollection,
				query: {}
			}

			controller._restReadCollection(req, res, function() {
				expect(res.data.data).to.have.length(2)
				expect(res.data).to.have.deep.property('data[0].title', 'Read1')
				expect(res.data).to.have.deep.property('data[1].title', 'Read2')
				done()
			})
		})

		it('should add the query to response data', function(done) {
			const res = new ResponseMock()
			const req = {
				collection: postsCollection,
				query: { title: 'Read1' }
			}

			controller._restReadCollection(req, res, function() {
				expect(res.data).to.have.deep.property('query.title', 'Read1')
				done()
			})
		})
	})

	describe('_restRead', function() {
		let controller
		let postIds = []

		before(function(done) {
			controller = new Controller(factory)

			postsCollection.model.create([
				{
					title: 'Read1',
					author: ids[0]
				},
				{
					title: 'Read2',
					author: ids[0]
				}
			], (err, docs) => {
				postIds[0] = docs[0]._id
				postIds[1] = docs[1]._id
				done(err)
			})
		})

		after(function() {
			mongoose.connection.db.dropCollection('posts')
		})

		it('should set a status of 200', function(done) {
			const req = {
				collection: postsCollection,
				documentId: postIds[0].toString()
			}
			const res = new ResponseMock()

			controller._restRead(req, res, function() {
				expect(res.statusSent).to.equal(200)
				done()
			})
		})

		it('should add the document to response data if successful', function(done) {
			const req = {
				collection: postsCollection,
				documentId: postIds[0].toString()
			}
			const res = new ResponseMock()

			controller._restRead(req, res, function() {
				expect(res.data).to.have.deep.property('data.title', 'Read1')
				done()
			})
		})

		it('should set a status of 404 if no matching id', function(done) {
			const badId = new mongoose.Types.ObjectId().toString()
			const req = {
				collection: postsCollection,
				documentId: badId
			}
			const res = new ResponseMock()

			controller._restRead(req, res, function() {
				expect(res.statusSent).to.equal(404)
				done()
			})
		})

	})

	describe('_restCreate', function() {
		let controller

		before(function() {
			controller = new Controller(factory)
		})

		afterEach(function() {
			mongoose.connection.db.dropCollection('posts')
		})

		it('should set a status of 201 when successful', function(done) {
			const req = {
				collection: postsCollection,
				body: { title: 'Create1', content: 'create content', author: ids[0] }
			}
			const res = new ResponseMock()

			controller._restCreate(req, res, function(err) {
				expect(res.statusSent).to.equal(201)
				done(err)
			})
		})

		it('should add the new document to response data', function(done) {
			const req = {
				collection: postsCollection,
				body: { title: 'Create1', content: 'create content', author: ids[0] }
			}
			const res = new ResponseMock()

			controller._restCreate(req, res, function() {
				expect(res.data).to.have.deep.property('data.title', 'Create1')
				expect(res.data).to.have.deep.property('data.content', 'create content')
				done()
			})
		})

		it('should set a status of 400 when validation errors', function(done) {
			const req = {
				collection: postsCollection,
				body: { content: 'create content', author: ids[0] }
			}
			const res = new ResponseMock()

			controller._restCreate(req, res, function(err) {
				expect(res.statusSent).to.equal(400)
				expect(err).to.have.deep.property('errors.title')
				done()
			})
		})
	})

	describe('_restUpdateCollection', function() {
		let controller

		before(function() {
			controller = new Controller(factory)
		})

		after(function() {
			mongoose.connection.db.dropCollection('posts')
		})

		it('should set a status of 200 when successful', function(done) {
			const req = {
				collection: postsCollection,
				body: [
					{ title: 'Update1', author: ids[0] },
					{ title: 'Update2', author: ids[0] },
					{ title: 'Update3', author: ids[0] }
				]
			}
			const res = new ResponseMock()

			controller._restUpdateCollection(req, res, function() {
				expect(res.statusSent).to.equal(200)
				done()
			})
		})

		it('should add the new collection to response data when successful', function(done) {
			const req = {
				collection: postsCollection,
				body: [
					{ title: 'Update1', author: ids[0] },
					{ title: 'Update2', author: ids[0] },
					{ title: 'Update3', author: ids[0] }
				]
			}
			const res = new ResponseMock()

			controller._restUpdateCollection(req, res, function() {
				expect(res.data).to.have.deep.property('data.[0].title', 'Update1')
				expect(res.data).to.have.deep.property('data.[1].title', 'Update2')
				expect(res.data).to.have.deep.property('data.[2].title', 'Update3')
				done()
			})
		})

		it('should set a status of 400 when validation errors', function(done) {
			const req = {
				collection: postsCollection,
				body: [
					{ author: ids[0] },
					{ title: 'Update2', author: ids[0] },
					{ title: 'Update3', author: ids[0] }
				]
			}
			const res = new ResponseMock()

			controller._restUpdateCollection(req, res, function(err) {
				expect(res.statusSent).to.equal(400)
				expect(err).to.have.deep.property('errors.title')
				done()
			})
		})
	})

	describe('_restUpdate', function() {
		let controller
		let postIds = []

		before(function() {
			controller = new Controller(factory)
		})

		beforeEach(function(done) {
			postsCollection.model.create([
				{
					title: 'Update1',
					author: ids[0]
				},
				{
					title: 'Update2',
					author: ids[0]
				}
			], (err, docs) => {
				postIds[0] = docs[0]._id
				postIds[1] = docs[1]._id
				done(err)
			})
		})

		afterEach(function() {
			mongoose.connection.db.dropCollection('posts')
		})

		it('should set a status of 200 when successful', function(done) {
			const req = {
				collection: postsCollection,
				documentId: postIds[0].toString(),
				body: {
					title: 'New Title'
				}
			}
			const res = new ResponseMock()

			controller._restUpdate(req, res, function() {
				expect(res.statusSent).to.equal(200)
				done()
			})
		})

		it('should add the updated document to response data when successful', function(done) {
			const req = {
				collection: postsCollection,
				documentId: postIds[0].toString(),
				body: {
					title: 'New Title'
				}
			}
			const res = new ResponseMock()

			controller._restUpdate(req, res, function() {
				expect(res.data).to.have.deep.property('data.title', 'New Title')
				done()
			})
		})

		it('should set a status of 400 when validation errors', function(done) {
			const req = {
				collection: postsCollection,
				documentId: postIds[0].toString(),
				body: {
					title: 'New Title',
					content: 'foobar'
				}
			}
			const res = new ResponseMock()

			controller._restUpdate(req, res, function(err) {
				expect(res.statusSent).to.equal(400)
				expect(err).to.have.deep.property('errors.content')
				done()
			})
		})
	})

	describe('_restDelCollection', function() {
		let controller

		before(function() {
			controller = new Controller(factory)
		})

		beforeEach(function(done) {
			postsCollection.model.create([
				{
					title: 'Update1',
					author: ids[0]
				},
				{
					title: 'Update2',
					author: ids[0]
				}
			], (err) => {
				done(err)
			})
		})

		afterEach(function() {
			mongoose.connection.db.dropCollection('posts')
		})

		it('should set a status of 200 when successfull', function(done) {
			const req = {
				collection: postsCollection
			}
			const res = new ResponseMock()

			controller._restDelCollection(req, res, function() {
				expect(res.statusSent).to.equal(200)
				done()
			})
		})
	})

	describe('_restDel', function() {
		let controller
		let postIds = []

		before(function() {
			controller = new Controller(factory)
		})

		beforeEach(function(done) {
			postsCollection.model.create([
				{
					title: 'Delete1',
					author: ids[0]
				},
				{
					title: 'Delete2',
					author: ids[0]
				}
			], (err, docs) => {
				postIds[0] = docs[0]._id
				postIds[1] = docs[1]._id
				done(err)
			})
		})

		afterEach(function() {
			mongoose.connection.db.dropCollection('posts')
		})

		it('should set a status of 200 when successful', function(done) {
			const req = {
				collection: postsCollection,
				documentId: postIds[0].toString()
			}
			const res = new ResponseMock()

			controller._restDel(req, res, function() {
				expect(res.statusSent).to.equal(200)
				done()
			})
		})

		it('should add the removed document to response data', function(done) {
			const req = {
				collection: postsCollection,
				documentId: postIds[0].toString()
			}
			const res = new ResponseMock()

			controller._restDel(req, res, function() {
				expect(res.data).to.have.deep.property('data.title', 'Delete1')
				done()
			})
		})

		it('should set a status of 404 when no document', function(done) {
			const badId = new mongoose.Types.ObjectId()
			const req = {
				collection: postsCollection,
				documentId: badId.toString()
			}
			const res = new ResponseMock()

			controller._restDel(req, res, function() {
				expect(res.statusSent).to.equal(404)
				done()
			})
		})
	})
})
