# sevr-rest

[![Build Status](https://travis-ci.org/ExclamationLabs/sevr-rest.svg?branch=master)](https://travis-ci.org/ExclamationLabs/sevr-rest)

RESTful API Plugin for the Sevr Framework

## Install

```
npm install --save sevr-rest
```

---

## Usage

```javascript
const rest = require('sevr-rest')

sevr.attach(rest, config)
```

## API

### Authorization

When authentication is enabled in Sevr, all requests will require authentication.
There are two methods available for authenticating a request: Basic Auth and JWT.

**Basic authentication** requires the following HTTP header:
```
Authorization: Basic [CREDENTIALS]
```
[CREDENTIALS] is the user's username and password separated by a colon and base64
encoded.

**JWT authentication** requires the following HTTP header:
```
Authorization: Bearer [TOKEN]
```
[TOKEN] is the JSON Web TOKEN

To obtain a JWT, a request must first be made to `/token`, authenticating the request
with Basic authentication.

### Endpoints

**CRUD Operations**

| Method | Path | Description |
| ------ | ---- | ----------- |
| GET | `/collection/:coll` | Get all documents for a collection |
| GET | `/collection/:coll/:id` | Get a single document by id |
| GET | `/collection/:coll/:id/:field` | Get a single document field |
| POST | `/collection/:coll` | Create a new document |
| PUT | `/collection/:coll` | Update the documents in a collection |
| PUT | `/collection/:coll/:id` | Update a document by id |
| DELETE | `/collection/:coll` | Delete all documents in a collection |
| DELETE | `/collection/:coll/:id` | Delete a document by id |

**Other**

| Method | Path | Description |
| ------ | ---- | ----------- |
| GET | `/definition/:coll` | Get the collection's definition |
| GET | `/token` | Get a JWT |

---

## Tests

```
npm test
```

---

## License

This project is licensed under the [MIT license](LICENSE).
