/*
 * Request handlers
 *
 */

// Dependencies
const _data = require('./data');
const helpers = require('./helpers');
const config = require('./../config');
const https = require('https');
const querystring = require('querystring');


// Define the handlers
var handlers = {};

// Users
handlers.users = (data, callback) => {
	var acceptableMethods = ['post', 'get', 'put', 'delete'];
	if (acceptableMethods.indexOf(data.method) > -1) {
		handlers._users[data.method](data, callback);
	} else {
		callback(405);
	}
};


// Container for the users submethods
handlers._users = {};

// Users - POST
// Required data: fullName, emailAddress, streetAddress, password, tosAgreement
// Optional data: none
handlers._users.post = (data, callback) => {
	// Check that all required fields are filled out
	var fullName = typeof(data.payload.fullName) == 'string' &&
		data.payload.fullName.trim().length > 0 ?
		data.payload.fullName.trim() : false;
	var emailAddress = typeof(data.payload.emailAddress) == 'string' &&
		data.payload.emailAddress.trim().length > 0 &&
		helpers.email_regexp.test(data.payload.emailAddress.trim()) ?
		data.payload.emailAddress.trim() : false;
	var streetAddress = typeof(data.payload.streetAddress) == 'string' &&
		data.payload.streetAddress.trim().length > 0 ?
		data.payload.streetAddress.trim() : false;
	var password = typeof(data.payload.password) == 'string' &&
		data.payload.password.trim().length > 0 ?
		data.payload.password.trim() : false;
	var tosAgreement =
		typeof(data.payload.tosAgreement) == 'boolean' &&
		data.payload.tosAgreement;

	if (fullName && emailAddress && streetAddress && password && tosAgreement) {
		// Make sure that user doesn't already exist
		_data.read('users', emailAddress, (err, data) => {
			if (err) {
				// Hash the password
				var hashPassword = helpers.hash(password);

				// Create the user object
				if (hashPassword) {
					var userObject = {
						'fullName': fullName,
						'emailAddress': emailAddress,
						'streetAddress': streetAddress,
						'hashPassword': hashPassword,
						'tosAgreement': true
					};

					// Store the user
					_data.create('users', emailAddress, userObject, err => {
						if (! err) {
							callback(200);
						} else {
							console.log(err);
							callback(500, { 'Error': 'Could not create the new user' });
						}
					});
				} else {
					callback(500, { 'Error': 'Could not hash the new user\'s password' });
				}
				
			} else {
				// User already exists
				callback(400, { 'Error' : 'A user with that email address already exists' });
			}
		});
	} else {
		callback(400, { 'Error': 'Missing required fields' });
	}
};

// Users - GET
// Required data: email
// Optional data: none
handlers._users.get = (data, callback) => {
	// Check that the email is valid
	var emailAddress = typeof(data.queryStringObject.emailAddress) == 'string' &&
		data.queryStringObject.emailAddress.trim().length > 0 &&
		helpers.email_regexp.test(data.queryStringObject.emailAddress.trim()) ?
		data.queryStringObject.emailAddress.trim() : false;

	if (emailAddress) {
		// Get the token from the headers
		var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
		// Verify that the given token is valid for the phone number
		handlers._tokens.verifyToken(token, emailAddress, tokenIsValid => {
			if (tokenIsValid) {
				// Lookup the user
				_data.read('users', emailAddress, (err, data) => {
					if (! err && data) {
						// Remove the hashed password from the user object
						delete data.hashPassword;
						callback(200, data);
					} else {
						callback(404);
					}
				});
			} else {
				callback(403, { 'Error': 'Missing required token in header, or token is invalid' });
			}
		});
	} else {
		callback(400, { 'Error': 'Missing required field' });
	}
};

// Users - PUT
// Required data: email
// Optional data: fullName, streetAddress, password (at least one must be specified)
handlers._users.put = (data, callback) => {
	// Check for the required field
	var emailAddress = typeof(data.payload.emailAddress) == 'string' &&
		data.payload.emailAddress.trim().length > 0 &&
		helpers.email_regexp.test(data.payload.emailAddress.trim()) ?
		data.payload.emailAddress.trim() : false;

	// Check for the optional fields
	var fullName = typeof(data.payload.fullName) == 'string' &&
		data.payload.fullName.trim().length > 0 ?
		data.payload.fullName.trim() : false;
	var streetAddress = typeof(data.payload.streetAddress) == 'string' &&
		data.payload.streetAddress.trim().length > 0 ?
		data.payload.streetAddress.trim() : false;
	var password = typeof(data.payload.password) == 'string' &&
		data.payload.password.trim().length > 0 ?
		data.payload.password.trim() : false;

	if (emailAddress && (fullName || streetAddress || password)) {
		// Get the token from the headers
		var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

		// Verify that the given token is valid for the phone number
		handlers._tokens.verifyToken(token, emailAddress, tokenIsValid => {
			if (tokenIsValid) {
				// Lookup the user
				_data.read('users', emailAddress, (err, data) => {
					if (! err && data) {
						// Update the fields necessary
						if (fullName) {
							data.fullName = fullName;
						}
						if (streetAddress) {
							data.streetAddress = streetAddress;
						}
						if (password) {
							data.hashPassword = helpers.hash(password);
						}

						// Store the new updates
						_data.update('users', emailAddress, data, err => {
							if (! err) {
								callback(200);
							} else {
								console.log(err);
								callback(500, { 'Error': 'Couldn\'t update the user' });
							}
						});
					} else {
						callback(400, { 'Error': 'The specified user does not exist' });
					}
				});
			} else {
				callback(403, { 'Error': 'Missing required token in header, or token is invalid' });
			}
		});
	} else {
		callback(400, { 'Error': 'Missing required field' });
	}
};

// Users - DELETE
// Required data: emailAddress
// Optional data: none
handlers._users.delete = (data, callback) => {
	// Check that the phone number is valid
	var emailAddress = typeof(data.payload.emailAddress) == 'string' &&
		data.payload.emailAddress.trim().length > 0 &&
		helpers.email_regexp.test(data.payload.emailAddress.trim()) ?
		data.payload.emailAddress.trim() : false;

	if (emailAddress) {
		// Get the token from the headers
		var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

		// Verify that the given token is valid for the emailAddress number
		handlers._tokens.verifyToken(token, emailAddress, tokenIsValid => {
			if (tokenIsValid) {
				// Lookup the user
				_data.read('users', emailAddress, (err, userData) => {
					if (! err && userData) {
						// Remove the user from the storage
						_data.delete('users', emailAddress, err => {
							if (! err) {
								callback(200);
							} else {
								callback(500, { 'Error': 'Could not delete the specified user' });
							}
						})
					} else {
						callback(400, { 'Error': 'Couldn\'t find the specified user' });
					}
				});
			} else {
				callback(403, { 'Error': 'Missing required token in header, or token is invalid' });
			}
		});
	} else {
		callback(400, { 'Error': 'Missing required field' });
	}
};


// Tokens
handlers.tokens = (data, callback) => {
	var acceptableMethods = ['post', 'get', 'put', 'delete'];
	if (acceptableMethods.indexOf(data.method) > -1) {
		handlers._tokens[data.method](data, callback);
	} else {
		callback(405);
	}
};


// Container for tokens methods
handlers._tokens = {};


// Tokens - POST
// Required data: emailAddress, password
// Optional data: none
handlers._tokens.post = (data, callback) => {
	var emailAddress = typeof(data.payload.emailAddress) == 'string' &&
		data.payload.emailAddress.trim().length > 0 &&
		helpers.email_regexp.test(data.payload.emailAddress.trim()) ?
		data.payload.emailAddress.trim() : false;
	var password = typeof(data.payload.password) == 'string' &&
		data.payload.password.trim().length > 0 ?
		data.payload.password.trim() : false;

	if (emailAddress && password) {
		// Lookup the user who matches that emailAddress number
		_data.read('users', emailAddress, (err, userData) => {
			if (! err && userData) {
				// Hash the sent password and compare it to the password in user object
				var hashPassword = helpers.hash(password);
				if (hashPassword == userData.hashPassword) {
					// If valid, create new token with a random name. Set expiration date 1 hour in the future
					var tokenId = helpers.createRandomString(20);
					var expires = Date.now() + 1000 * 60 * 60;
					var tokenObject = {
						'emailAddress': emailAddress,
						'id': tokenId,
						'expires': expires
					}

					// Store the token
					_data.create('tokens', tokenId, tokenObject, err => {
						if (! err) {
							callback(200, tokenObject);
						} else {
							callback(500, { 'Error': 'Could not create the new token' });
						}
					});
				} else {
					callback(400, { 'Error': 'Password did not match the specified user\'s stored password' });
				}
			} else {
				callback(400, { 'Error': 'Could not find the specified user' });
			}
		});
	} else {
		callback(400, { 'Error': 'Missing required fields' });
	}
};

// Tokens - GET
// Required data: id
// Optional data: none
handlers._tokens.get = (data, callback) => {
	// Check that the id which is sent is valid
	var id = typeof(data.queryStringObject.id) == "string" &&
		data.queryStringObject.id.trim().length == 20 ?
		data.queryStringObject.id.trim() : false;

	if (id) {
		// Lookup the user
		_data.read('tokens', id, (err, tokenData) => {
			if (! err && tokenData) {
				callback(200, tokenData);
			} else {
				callback(404);
			}
		});
	} else {
		callback(400, { 'Error': 'Missing required field' });
	}
};

// Tokens - PUT
// Required data: id, extend
// Optional data: none
handlers._tokens.put = (data, callback) => {
	var id = typeof(data.payload.id) == 'string' &&
		data.payload.id.trim().length == 20 ?
		data.payload.id.trim() : false;
	var extend = typeof(data.payload.extend) == 'boolean' && data.payload.extend;

	if (id && extend) {
		// Lookup the token
		_data.read('tokens', id, (err, tokenData) => {
			if (! err && tokenData) {
				// Check that the token isn't already expired
				if (tokenData.expires > Date.now()) {
					// Set the expiration an hour from now
					tokenData.expires = Date.now() + 1000 * 60 * 60;

					// Store the new update
					_data.update('tokens', id, tokenData, err => {
						if (! err) {
							callback(200);
						} else {
							callback(500, { 'Error': 'Could not update the token\'s expiration' });
						}
					});
				} else {
					callback(400, { 'Error': 'The token has already expired and cannot be extended' });
				}
			} else {
				callback(400, { 'Error': 'Specified token does not exist' });
			}
		});
	} else {
		callback(400, { 'Error': 'Missing required field(s) or field(s) are invalid' });
	}
};

// Tokens - DELETE
// Required data: id
// Optional data: none
handlers._tokens.delete = (data, callback) => {
	// Check that the id number is valid
	var id = typeof(data.queryStringObject.id) == "string" &&
		data.queryStringObject.id.trim().length == 20 ?
		data.queryStringObject.id.trim() : false;

	if (id) {
		// Lookup the user
		_data.read('tokens', id, (err, data) => {
			if (! err && data) {
				// Remove the user from the storage
				_data.delete('tokens', id, err => {
					if (! err) {
						callback(200);
					} else {
						callback(500, { 'Error': 'Could not delete the specified token' });
					}
				})
			} else {
				callback(400, { 'Error': 'Couldn\'t find the specified token' });
			}
		});
	} else {
		callback(400, { 'Error': 'Missing required field' });
	}
};


// Verify if a given token id is currently valid for a given user
handlers._tokens.verifyToken = (id, emailAddress, callback) => {
	// Lookup the token
	_data.read('tokens', id, (err, tokenData) => {
		if (! err && tokenData) {
			// Check that token belongs to the user and is not expired
			if (tokenData.emailAddress === emailAddress && tokenData.expires > Date.now()) {
				callback(true);
			} else {
				callback(false);
			}
		} else {
			callback(false);
		}
	});
};


// Items
handlers.items = (data, callback) => {
	var acceptableMethods = ['post', 'get', 'put', 'delete'];
	if (acceptableMethods.indexOf(data.method) > -1) {
		handlers._items[data.method](data, callback);
	} else {
		callback(405);
	}
};


// Container for items methods
handlers._items = {};


// Items - POST
// Required data: adminPassword, itemId, itemTitle, itemPrice
// Optinal data: none
handlers._items.post = (data, callback) => {
	var adminPassword = typeof(data.payload.adminPassword) == 'string' &&
		data.payload.adminPassword.trim().length > 0 ?
		data.payload.adminPassword.trim() : false;
	var itemId = typeof(data.payload.itemId) == 'string' &&
		data.payload.itemId.trim().length == 4 ?
		data.payload.itemId.trim() : false;
	var itemTitle = typeof(data.payload.itemTitle) == 'string' &&
		data.payload.itemTitle.trim().length > 0 ?
		data.payload.itemTitle.trim() : false;
	var itemPrice = typeof(data.payload.itemPrice) == 'number' &&
		0 < data.payload.itemPrice && data.payload.itemPrice < 1000 ?
		data.payload.itemPrice : false;

	if (adminPassword && itemId && itemTitle && itemPrice) {
		if (helpers.hash(adminPassword) == config.adminPasswordHash) {
			// Check that no record with the same item ID exists
			_data.read('items', itemId, (err, itemData) => {
				if (err) {
					// Pack data into item object
					var itemData = {
						'title': itemTitle,
						'price': itemPrice
					};

					// Write the data into the new record
					_data.create('items', itemId, itemData, err => {
						if (! err) {
							callback(200);
						} else {
							callback(500, { 'Error': 'Couldn\'t save item to database' });
						}
					});
				} else {
					callback(400, { 'Error': 'Item with provided ID already exists' });
				}
			});
		} else {
			callback(401, { 'Error': 'Admininstrator needs to provide their password to access' });
		}
	} else {
		callback(400, { 'Error': 'Missing required fields' });
	}
};


// Items - GET
// Required data: adminPassword, itemId
// Optinal data: none
handlers._items.get = (data, callback) => {
	// Note that headers are used to transport admin password
	var adminPassword = typeof(data.headers.adminpassword) == 'string' &&
		data.headers.adminpassword.trim().length > 0 ?
		data.headers.adminpassword.trim() : false;
	var itemId = typeof(data.queryStringObject.itemId) == 'string' &&
		data.queryStringObject.itemId.trim().length == 4 ?
		data.queryStringObject.itemId.trim() : false;

	if (adminPassword && itemId) {
		if (helpers.hash(adminPassword) == config.adminPasswordHash) {
			// Read the item if it exists
			_data.read('items', itemId, (err, itemData) => {
				if (! err && itemData) {
					callback(200, itemData);
				} else {
					callback(400, { 'Error': 'Item with provided ID does not exist' });
				}
			});
		} else {
			callback(401, { 'Error': 'Admininstrator needs to provide their password to access' });
		}
	} else {
		callback(400, { 'Error': 'Missing required fields' });
	}
};


// Items - PUT
// Required data: adminPassword, itemId
// Optinal data: itemTitle, itemPrice
handlers._items.put = (data, callback) => {
	var adminPassword = typeof(data.payload.adminPassword) == 'string' &&
		data.payload.adminPassword.trim().length > 0 ?
		data.payload.adminPassword.trim() : false;
	var itemId = typeof(data.payload.itemId) == 'string' &&
		data.payload.itemId.trim().length == 4 ?
		data.payload.itemId.trim() : false;
	var itemTitle = typeof(data.payload.itemTitle) == 'string' &&
		data.payload.itemTitle.trim().length > 0 ?
		data.payload.itemTitle.trim() : false;
	var itemPrice = typeof(data.payload.itemPrice) == 'number' &&
		0 < data.payload.itemPrice && data.payload.itemPrice < 1000 ?
		data.payload.itemPrice : false;

	if (adminPassword && itemId && (itemTitle || itemPrice)) {
		if (helpers.hash(adminPassword) == config.adminPasswordHash) {
			// Check that the item with provided ID exists
			_data.read('items', itemId, (err, itemData) => {
				if (! err && itemData) {
					// Pack updated item data into an object
					var newItemData = itemData;

					if (itemTitle) {
						newItemData['title'] = itemTitle;
					}
					if (itemPrice) {
						newItemData['price'] = itemPrice;
					}

					// Write out the new object into the DB
					_data.update('items', itemId, newItemData, err => {
						if (! err) {
							callback(200);
						} else {
							callback(500, { 'Error': 'Couldn\'t update the data in the database' });
						}
					});
				} else {
					callback(400, { 'Error': 'Item with provided ID does not exist' });
				}
			});
		} else {
			callback(401, { 'Error': 'Admininstrator needs to provide their password to access' });
		}
	} else {
		callback(400, { 'Error': 'Missing required fields' });
	}
};


// Items - DELETE
// Required data: adminPassword, itemId
// Optinal data: none
handlers._items.delete = (data, callback) => {
	var adminPassword = typeof(data.payload.adminPassword) == 'string' &&
		data.payload.adminPassword.trim().length > 0 ?
		data.payload.adminPassword.trim() : false;
	var itemId = typeof(data.payload.itemId) == 'string' &&
		data.payload.itemId.trim().length == 4 ?
		data.payload.itemId.trim() : false;

	if (adminPassword && itemId) {
		if (helpers.hash(adminPassword) == config.adminPasswordHash) {
			// Check that record with the provided item ID exists
			_data.read('items', itemId, (err, itemData) => {
				if (! err && itemData) {
					// Write the data into the new record
					_data.delete('items', itemId, err => {
						if (! err) {
							callback(200);
						} else {
							callback(500, { 'Error': 'Couldn\'t delete item from database' });
						}
					});
				} else {
					callback(400, { 'Error': 'Item with provided ID does not exist' });
				}
			});
		} else {
			callback(401, { 'Error': 'Admininstrator needs to provide their password to access' });
		}
	} else {
		callback(400, { 'Error': 'Missing required fields' });
	}
};


// Menu
handlers.menu = (data, callback) => {
	var acceptableMethods = ['get'];
	if (acceptableMethods.indexOf(data.method) > -1) {
		handlers._menu[data.method](data, callback);
	} else {
		callback(405);
	}
};


// Container for menu data and methods
handlers._menu = {};


// GET all menu items, now they are just hardcoded in _menu.itemList
// This method works only if user is logged in
// Required data: emailAddress
// Optional data: none
handlers._menu.get = (data, callback) => {
	var emailAddress = typeof(data.queryStringObject.emailAddress) == 'string' &&
		data.queryStringObject.emailAddress.trim().length > 0 &&
		helpers.email_regexp.test(data.queryStringObject.emailAddress.trim()) ?
		data.queryStringObject.emailAddress.trim() : false;

	if (emailAddress) {
		// Get the token from the headers
		var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

		// Verify that the given token is valid for the emailAddress
		handlers._tokens.verifyToken(token, emailAddress, tokenIsValid => {
			if (tokenIsValid) {
				_data.list('items', (err, itemList) => {
					if (! err && itemList && itemList.length > 0) {
						// List of items as JS objects
						var result = [];
						// Items that has been read
						var itemsReadCount = 0;
						// Flags for errors occured
						var errors = false;

						itemList.forEach(fileName => {
							_data.read('items', fileName, (err, itemData) => {
								if (! err && itemData) {
									result.push({
										'id': fileName, // File name is derived from id
										'title': itemData.title,
										'price': itemData.price
									});
								} else {
									errors = true;
								}

								++itemsReadCount;

								// When all the items been read
								if (itemsReadCount == itemList.length) {
									if (errors) {
										console.log("Errors occured during reading items database");
									}

									// Result should contain all the item data, unless an error occured
									if (result.length > 0) {
										callback(200, result);
									} else {
										callback(500, { 'Error': "Couldn't form nonempty list of items" });
									}
								}
							});
						});						
					} else {
						callback(500, { 'Error': "Couldn't access item database" });
					}
				});
			} else {
				callback(403, { 'Error': 'Missing required token in header, or token is invalid' });
			}
		});
	} else {
		callback(400, { 'Error': "Missing required field" });
	}
};


// Shopping Cart - the interface for ordering
handlers.cart = (data, callback) => {
	var acceptableMethods = ['post', 'get', 'put', 'delete'];
	if (acceptableMethods.indexOf(data.method) > -1) {
		handlers._cart[data.method](data, callback);
	} else {
		callback(405);
	}
};


// Container for cart methods
handlers._cart = {};


// Cart - POST
// Create new cart with some order in it. Each user can have only one shopping cart
// Required data: emailAddress, order
// Optional data: none
handlers._cart.post = (data, callback) => {
	var emailAddress = typeof(data.payload.emailAddress) == 'string' &&
		data.payload.emailAddress.trim().length > 0 &&
		helpers.email_regexp.test(data.payload.emailAddress.trim()) ?
		data.payload.emailAddress.trim() : false;
	var order = typeof(data.payload.order) == 'object' &&
		data.payload.order instanceof Array &&
		data.payload.order.length > 0 ?
		data.payload.order : false;

	if (emailAddress && order) {
		// Get the token from the headers
		var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

		// Verify that the given token is valid for the emailAddress
		handlers._tokens.verifyToken(token, emailAddress, tokenIsValid => {
			if (tokenIsValid) {
				_data.read('carts', emailAddress, (err, cartData) => {
					if (err) {
						_data.list('items', (err, itemList) => {
							if (! err) {
								var cartData = {
									'orderList': []
								};
								// Error and warning flags
								var orderParsingErrors = false;

								order.forEach(item => {
									// Collect amount and id of the item
									var id = typeof(item.id) == 'string' && item.id.trim().length == 4 ? item.id.trim() : false;
									var amount = typeof(item.amount) == 'number' && item.amount > 0 ? item.amount : false;

									if (id && amount && itemList.indexOf(id) > -1) {
										cartData.orderList.push({
											"id": id,
											"amount": amount
										});
									} else {
										orderParsingErrors = true;
									}
								});

								// If errors have occured, log them
								if (orderParsingErrors) {
									console.log("Errors occured during order dispatching");
								}

								// Do not allow empty orders and thus empty carts
								if (cartData.orderList.length > 0) {
									_data.create('carts', emailAddress, cartData, err => {
										if (! err) {
											callback(200);
										} else {
											callback(500, { 'Error' : "Couldn't create shopping cart for the user" });
										}
									});
								} else {
									callback(400, { 'Error': "Order is empty or incorrectly formed" });
								}
							} else {
								callback(500, { 'Error': "Couldn't create item list" });
							}
						});
					} else {
						callback(400, { 'Error': "Shopping cart for the user already exists" });
					}
				});
			} else {
				callback(403, { 'Error': 'Missing required token in header, or token is invalid' });
			}
		});
	} else {
		callback(400, { 'Error': "Missing required field" });
	}
};


// Cart - GET
// Lists all the items and their amounts in shopping cart of the user
// Required data: emailAddress
// Optional data: none
handlers._cart.get = (data, callback) => {
	var emailAddress = typeof(data.queryStringObject.emailAddress) == 'string' &&
		data.queryStringObject.emailAddress.trim().length > 0 &&
		helpers.email_regexp.test(data.queryStringObject.emailAddress.trim()) ?
		data.queryStringObject.emailAddress.trim() : false;

	if (emailAddress) {
		// Get the token from the headers
		var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

		// Verify that the given token is valid for the emailAddress
		handlers._tokens.verifyToken(token, emailAddress, tokenIsValid => {
			if (tokenIsValid) {
				_data.read('carts', emailAddress, (err, cartData) => {
					if (! err && cartData) {
						callback(200, cartData);
					} else {
						callback(400, { 'Error': "Couldn't read user's shopping cart: it may not exist" });
					}
				});
			} else {
				callback(403, { 'Error': 'Missing required token in header, or token is invalid' });
			}
		});
	} else {
		callback(400, { 'Error': "Missing required field" });
	}
};


// Cart - PUT
// Update the shopping cart of the user before placing the order
// Required data: emailAddress, order
// Optional data: none
handlers._cart.put = (data, callback) => {
	var emailAddress = typeof(data.payload.emailAddress) == 'string' &&
		data.payload.emailAddress.trim().length > 0 &&
		helpers.email_regexp.test(data.payload.emailAddress.trim()) ?
		data.payload.emailAddress.trim() : false;
	var order = typeof(data.payload.order) == 'object' &&
		data.payload.order instanceof Array &&
		data.payload.order.length > 0 ?
		data.payload.order : false;

	if (emailAddress && order) {
		// Get the token from the headers
		var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

		// Verify that the given token is valid for the emailAddress
		handlers._tokens.verifyToken(token, emailAddress, tokenIsValid => {
			if (tokenIsValid) {
				_data.read('carts', emailAddress, (err, cartData) => {
					if (! err) {
						_data.list('items', (err, itemList) => {
							if (! err) {
								var cartData = {
									'orderList': []
								};
								// Error and warning flags
								var orderParsingErrors = false;

								order.forEach(item => {
									// Collect amount and id of the item
									var id = typeof(item.id) == 'string' && item.id.trim().length == 4 ? item.id.trim() : false;
									var amount = typeof(item.amount) == 'number' && item.amount > 0 ? item.amount : false;

									if (id && amount && itemList.indexOf(id) > -1) {
										cartData.orderList.push({
											"id": id,
											"amount": amount
										});
									} else {
										orderParsingErrors = true;
									}
								});

								// If errors have occured, log them
								if (orderParsingErrors) {
									console.log("Errors occured during order dispatching");
								}

								// Do not allow empty orders and thus empty carts
								if (cartData.orderList.length > 0) {
									_data.update('carts', emailAddress, cartData, err => {
										if (! err) {
											callback(200);
										} else {
											callback(500, { 'Error' : "Couldn't create shopping cart for the user" });
										}
									});
								} else {
									callback(400, { 'Error': "Order is empty or incorrectly formed" });
								}
							} else {
								callback(500, { 'Error': "Couldn't create item list" });
							}
						});
					} else {
						callback(400, { 'Error': "Shopping cart for the user does not exist" });
					}
				});
			} else {
				callback(403, { 'Error': 'Missing required token in header, or token is invalid' });
			}
		});
	} else {
		callback(400, { 'Error': "Missing required field" });
	}
};


// Cart - DELETE
// Wipe shopping cart
// Required data: emailAddress
// Optional data: none
handlers._cart.delete = (data, callback) => {
	var emailAddress = typeof(data.payload.emailAddress) == 'string' &&
		data.payload.emailAddress.trim().length > 0 &&
		helpers.email_regexp.test(data.payload.emailAddress.trim()) ?
		data.payload.emailAddress.trim() : false;

	if (emailAddress) {
		// Get the token from the headers
		var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

		// Verify that the given token is valid for the emailAddress
		handlers._tokens.verifyToken(token, emailAddress, tokenIsValid => {
			if (tokenIsValid) {
				_data.delete('carts', emailAddress, err => {
					if (! err) {
						callback(200);
					} else {
						callback(500, { 'Error': "Couldn't delete user's shopping cart" });
					}
				});
			} else {
				callback(403, { 'Error': 'Missing required token in header, or token is invalid' });
			}
		});
	} else {
		callback(400, { 'Error': "Missing required field" });
	}
};


// Order - the interface for payment
handlers.order = (data, callback) => {
	var acceptableMethods = ['post'];
	if (acceptableMethods.indexOf(data.method) > -1) {
		handlers._order[data.method](data, callback);
	} else {
		callback(405);
	}
};


// Container for cart methods
handlers._order = {};


// Order - POST
// Make an order on all goods currently in shopping cart and pay for them
// Required data: emailAddress
// Optional data: none
handlers._order.post = (data, callback) => {
	var emailAddress = typeof(data.payload.emailAddress) == 'string' &&
		data.payload.emailAddress.trim().length > 0 &&
		helpers.email_regexp.test(data.payload.emailAddress.trim()) ?
		data.payload.emailAddress.trim() : false;

	if (emailAddress) {
		// Get the token from the headers
		var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

		// Verify that the given token is valid for the emailAddress
		handlers._tokens.verifyToken(token, emailAddress, tokenIsValid => {
			if (tokenIsValid) {
				// Read user's shopping cart and calculate total price
				_data.read('carts', emailAddress, (err, cartData) => {
					if (! err && cartData) {
						var errors = false;
						var totalPrice = 0;
						var receiptText = `Receipt for ${emailAddress}:<br>`;

						// Sum prices for each item type in itemOrder object
						cartData.orderList.forEach((itemOrder, index, array) => {
							_data.read('items', itemOrder.id, (err, itemData) => {
								if (! err && itemData) {
									// Add items' price to total
									var subtotal = itemOrder.amount * itemData.price;
									totalPrice += subtotal;
									receiptText += `${itemData.title} : ${itemOrder.amount} x ${itemData.price} = ${subtotal}<br>`;

									// When all item orders are processed
									if (array.length === index + 1) {
										if (! errors) {
											// Add total to receipt
											receiptText += `Total : ${totalPrice}<br>`

											// Delete user's cart so not to accedentally make two orders
											_data.delete('carts', emailAddress, err => {
												if (! err) {
													// Create a stripe charge for the user's order
													helpers.createStripeCharge({
														amount: totalPrice,
														currency: 'usd',
														description: 'Charge for order',
														source: config.stripeTestToken,
													}, err => {
														if (! err) {
															helpers.sendMailReceipt(emailAddress, receiptText, err => {
																if (! err) {
																	callback(200);
																} else {
																	callback(500, { 'Error': "Couldn't send user a receipt via mail" });
																}
															});
														} else {
															callback(500, { 'Error': "Error during creating charge on Stripe.com" });
														}
													});
												} else {
													callback(500, { 'Error': "Couldn't delete user's shopping cart" });
												}
											});
										} else {
											callback(500, { 'Error': "Some errors encountered during order dispatching" });
										}
									}
								} else {
									errors = true;
								}
							});
						});
					} else {
						callback(400, { 'Error': "The user has no shopping cart" });
					}
				});
			} else {
				callback(403, { 'Error': 'Missing required token in header, or token is invalid' });
			}
		});
	} else {
		callback(400, { 'Error': "Missing required field" });
	}
};


// Ping service
handlers.ping = (data, callback) => {
	callback(200);
}

// Not found handler
handlers.notFound = (data, callback) => {
	callback(404);
};


// Export the module
module.exports = handlers;