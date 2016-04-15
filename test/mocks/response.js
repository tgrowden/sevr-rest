'use strict'

class Response {
	constructor() {
		this._status = 200
		this._sendData = undefined
		this.data = undefined
	}
	
	get statusSent() {
		return this._status
	}
	
	get statusCode() {
		return this._status
	}
	
	set statusCode(status) {
		this._status = status
	}
	
	get dataSent() {
		return this._sendData
	}
	
	status(status) {
		this._status = status
		return this
	}
	
	send(data) {
		this._sendData = data
		return this
	}
}

module.exports = Response