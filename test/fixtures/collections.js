'use strict'

const types = require('mongoose').Schema.Types

module.exports = {

	users: {
		singular: 'User',
		fields: {
			username: {
				label: 'Username',
				schemaType: {
					type: String,
					required: true
				}
			},
			email: {
				label: 'Email',
				schemaType: {
					type: String
				}
			}
		},
		meta: {
			description: 'A collection of users for the CMS'
		},
		permissions: {
			read: 'admin',
			write: 'admin'
		}
	},

	posts: {
		singular: 'Post',
		fields: {
			title: {
				label: 'Title',
				schemaType: {
					type: String,
					required: true
				}
			},
			content: {
				label: 'Content',
				schemaType: {
					type: String,
					validate: {
						validator: val => {
							return val != 'foobar'
						},
						message: '{PATH} must not equal foobar'
					}
				}
			},
			author: {
				label: 'Author',
				schemaType: {
					type: types.ObjectId,
					ref: 'User',
					required: true
				}
			}
		}
	},

	tags: {
		singular: 'Tag',
		fields: {},
		permissions: {
			read: '*',
			write: ['admin','author']
		}
	}

}
