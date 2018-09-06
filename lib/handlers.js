/*
 * Request handlers
 *
 */

// Dependencies
const _data = require('./data');
const helpers = require('./helpers');
const config = require('./../config');


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
// Required data: firstName, lastName, phone, password, tosAgreement
// Optional data: none
handlers._users.post = (data, callback) => {
	// Check that all required fields are filled out
	var firstName = typeof(data.payload.firstName) == 'string' &&
		data.payload.firstName.trim().length > 0 ?
		data.payload.firstName.trim() : false;
	var lastName = typeof(data.payload.lastName) == 'string' &&
		data.payload.lastName.trim().length > 0 ?
		data.payload.lastName.trim() : false;
	var phone = typeof(data.payload.phone) == 'string' &&
		data.payload.phone.trim().length == 10 ?
		data.payload.phone.trim() : false;
	var password = typeof(data.payload.password) == 'string' &&
		data.payload.password.trim().length > 0 ?
		data.payload.password.trim() : false;
	var tosAgreement =
		typeof(data.payload.tosAgreement) == 'boolean' &&
		data.payload.tosAgreement;

	if (firstName && lastName && phone && password && tosAgreement) {
		// Make sure that user doesn't already exist
		_data.read('users', phone, (err, data) => {
			if (err) {
				// Hash the password
				var hashPassword = helpers.hash(password);

				// Create the user object
				if (hashPassword) {
					var userObject = {
						'firstName': firstName,
						'lastName': lastName,
						'phone': phone,
						'hashPassword': hashPassword,
						'tosAgreement': true
					};

					// Store the user
					_data.create('users', phone, userObject, err => {
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
				callback(400, { 'Error' : 'A user with that phone number already exists' });
			}
		});
	} else {
		callback(400, { 'Error': 'Missing required fields' });
	}
};

// Users - GET
// Required data: phone
// Optional data: none
handlers._users.get = (data, callback) => {
	// Check that the phone number is valid
	var phone = typeof(data.queryStringObject.phone) == "string" &&
		data.queryStringObject.phone.trim().length == 10 ?
		data.queryStringObject.phone.trim() : false;

	if (phone) {
		// Get the token from the headers
		var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
		// Verify that the given token is valid for the phone number
		handlers._tokens.verifyToken(token, phone, tokenIsValid => {
			if (tokenIsValid) {
				// Lookup the user
				_data.read('users', phone, (err, data) => {
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
// Required data: phone
// Optional data: firstName, lastName, password (at least one must be specified)
handlers._users.put = (data, callback) => {
	// Check for the required field
	var phone = typeof(data.payload.phone) == "string" &&
		data.payload.phone.trim().length == 10 ?
		data.payload.phone.trim() : false;

	// Check for the optional fields
	var firstName = typeof(data.payload.firstName) == 'string' &&
		data.payload.firstName.trim().length > 0 ?
		data.payload.firstName.trim() : false;
	var lastName = typeof(data.payload.lastName) == 'string' &&
		data.payload.lastName.trim().length > 0 ?
		data.payload.lastName.trim() : false;
	var password = typeof(data.payload.password) == 'string' &&
		data.payload.password.trim().length > 0 ?
		data.payload.password.trim() : false;

	if (phone && (firstName || lastName || password)) {
		// Get the token from the headers
		var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

		// Verify that the given token is valid for the phone number
		handlers._tokens.verifyToken(token, phone, tokenIsValid => {
			if (tokenIsValid) {
				// Lookup the user
				_data.read('users', phone, (err, data) => {
					if (! err && data) {
						// Update the fields necessary
						if (firstName) {
							data.firstName = firstName;
						}
						if (lastName) {
							data.lastName = lastName;
						}
						if (password) {
							data.hashPassword = helpers.hash(password);
						}

						// Store the new updates
						_data.update('users', phone, data, err => {
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
// Required data: phone
// Optional data: none
handlers._users.delete = (data, callback) => {
	// Check that the phone number is valid
	var phone = typeof(data.queryStringObject.phone) == "string" &&
		data.queryStringObject.phone.trim().length == 10 ?
		data.queryStringObject.phone.trim() : false;

	if (phone) {
		// Get the token from the headers
		var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

		// Verify that the given token is valid for the phone number
		handlers._tokens.verifyToken(token, phone, tokenIsValid => {
			if (tokenIsValid) {
				// Lookup the user
				_data.read('users', phone, (err, userData) => {
					if (! err && userData) {
						// Remove the user from the storage
						_data.delete('users', phone, err => {
							if (! err) {
								// Need to delete each of the checks associated with the user
								var userChecks = typeof(userData.checks) == 'object' &&
									userData.checks instanceof Array ?
									userData.checks : [];
								var checksToDelete = userChecks.length;

								if (checksToDelete > 0) {
									var checksDeleted = 0;
									var deletionErrors = false;

									// Loop through the checks
									userChecks.forEach(checkId => {
										// Delete the check
										_data.delete('checks', checkId, err => {
											if (err) {
												deletionErrors = true;
											}
											++checksDeleted;

											if (checksDeleted == checksToDelete) {
												if (! deletionErrors) {
													callback(200);
												} else {
													callback(500, { 'Error': 'Errors encountered while attempting to delete all of the user\'s check objects. All checks may have not been deleted from the system successfully' });
												}
											}
										});
									});
								} else {
									callback(200);
								}
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
// Required data: phone, password
// Optional data: none
handlers._tokens.post = (data, callback) => {
	var phone = typeof(data.payload.phone) == 'string' &&
		data.payload.phone.trim().length == 10 ?
		data.payload.phone.trim() : false;
	var password = typeof(data.payload.password) == 'string' &&
		data.payload.password.trim().length > 0 ?
		data.payload.password.trim() : false;

	if (phone && password) {
		// Lookup the user who matches that phone number
		_data.read('users', phone, (err, userData) => {
			if (! err && userData) {
				// Hash the sent password and compare it to the password in user object
				var hashPassword = helpers.hash(password);
				if (hashPassword == userData.hashPassword) {
					// If valid, create new token with a random name. Set expiration date 1 hour in the future
					var tokenId = helpers.createRandomString(20);
					var expires = Date.now() + 1000 * 60 * 60;
					var tokenObject = {
						'phone': phone,
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
		// 
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
handlers._tokens.verifyToken = (id, phone, callback) => {
	// Lookup the token
	_data.read('tokens', id, (err, tokenData) => {
		if (! err && tokenData) {
			// Check that token belongs to the user and is not expired
			if (tokenData.phone === phone && tokenData.expires > Date.now()) {
				callback(true);
			} else {
				callback(false);
			}
		} else {
			callback(false);
		}
	});
};


// Checks
handlers.checks = (data, callback) => {
	var acceptableMethods = ['post', 'get', 'put', 'delete'];
	if (acceptableMethods.indexOf(data.method) > -1) {
		handlers._checks[data.method](data, callback);
	} else {
		callback(405);
	}
};


// Container for checks
handlers._checks = {};


// Checks - POST
// Requried data: protocol, url, method, successCodes, timeoutSeconds
// Optional data: none
handlers._checks.post = (data, callback) => {
	// Validate inputs
	var protocol = typeof(data.payload.protocol) == 'string' &&
		['https', 'http'].indexOf(data.payload.protocol) > -1 ?
		data.payload.protocol.trim() : false;
	var url = typeof(data.payload.url) == 'string' &&
		data.payload.url.trim().length > 0 ?
		data.payload.url.trim() : false;
	var method = typeof(data.payload.method) == 'string' &&
		['post', 'get', 'put', 'delete'].indexOf(data.payload.method) > -1 ?
		data.payload.method.trim() : false;
	var successCodes = typeof(data.payload.successCodes) == 'object' &&
		data.payload.successCodes instanceof Array &&
		data.payload.successCodes.length > 0 ?
		data.payload.successCodes : false;
	var timeoutSeconds = typeof(data.payload.timeoutSeconds) == 'number' &&
		data.payload.timeoutSeconds % 1 === 0 &&
		data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ?
		data.payload.timeoutSeconds : false;

	if (protocol && url && method && successCodes && timeoutSeconds) {
		// Get the token from the headers
		var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

		// Lookup the user by reading the token
		_data.read('tokens', token, (err, tokenData) => {
			if (! err && tokenData) {
				var userPhone = tokenData.phone;

				// Lookup the user data
				_data.read('users', userPhone, (err, userData) => {
					if (! err && userData) {
						var userChecks = typeof(userData.checks) == 'object' &&
							userData.checks instanceof Array ?
							userData.checks : [];

						// Verify that user has less than the number of max-checks-per-user
						if (userChecks.length < config.maxChecks) {
							// Create a random id for the check
							var checkId = helpers.createRandomString(20);

							// Create the check object, and include the user's phone
							var checkObject = {
								'id': checkId,
								'userPhone': userPhone,
								'protocol': protocol,
								'url': url,
								'method': method,
								'successCodes': successCodes,
								'timeoutSeconds': timeoutSeconds
							};

							// Store the check object on disk
							_data.create('checks', checkId, checkObject, err => {
								if (! err) {
									// Add the check id to the user's object
									userData.checks = userChecks;
									userData.checks.push(checkId);

									// Update user data on disk
									_data.update('users', userPhone, userData, err => {
										if (! err) {
											// Return the data about the new check
											callback(200, checkObject);
										} else {
											callback(500, { 'Error': 'Could not update the user with the new check' });
										}
									});
								} else {
									callback(500, { 'Error': 'Could not create a new check' });
								}
							});
						} else {
							callback(400, { 'Error': `The user already has the maximum number of checks (${config.maxChecks})` });
						}
					} else {
						callback(403);
					}
				});
			} else {
				callback(403)
			}
		});
	} else {
		callback(400, { 'Error': 'Missing required inputs, or inputs are invalid' });
	}
};


// Checks - GET
// Required data: id
// Optional data: none
handlers._checks.get = (data, callback) => {
	// Check that the phone number is valid
	var id = typeof(data.queryStringObject.id) == "string" &&
		data.queryStringObject.id.trim().length == 20 ?
		data.queryStringObject.id.trim() : false;

	if (id) {
		// Lookup the check
		_data.read('checks', id, (err, checkData) => {
			if (! err && checkData) {
				// Get the token from the headers
				var token = typeof(data.headers.token) == 'string' ?
					data.headers.token : false;
				// Verify that the given token is valid and belongs to the user who created the check
				handlers._tokens.verifyToken(token, checkData.userPhone, tokenIsValid => {
					if (tokenIsValid) {
						// Return the check data
						callback(200, checkData);
					} else {
						callback(403);
					}
				});
			} else {
				callback(404);
			}
		});
	} else {
		callback(400, { 'Error': 'Missing required field' });
	}
};


// Check - PUT
// Required data: id
// Optional data: protocol, url, method, successCodes, timeoutSeconds (one must be present)
handlers._checks.put = (data, callback) => {
	// Check for the required field
	var id = typeof(data.payload.id) == "string" &&
		data.payload.id.trim().length == 20 ?
		data.payload.id.trim() : false;

	// Check for the optional fields
	var protocol = typeof(data.payload.protocol) == 'string' &&
		['https', 'http'].indexOf(data.payload.protocol) > -1 ?
		data.payload.protocol.trim() : false;
	var url = typeof(data.payload.url) == 'string' &&
		data.payload.url.trim().length > 0 ?
		data.payload.url.trim() : false;
	var method = typeof(data.payload.method) == 'string' &&
		['post', 'get', 'put', 'delete'].indexOf(data.payload.method) > -1 ?
		data.payload.method.trim() : false;
	var successCodes = typeof(data.payload.successCodes) == 'object' &&
		data.payload.successCodes instanceof Array &&
		data.payload.successCodes.length > 0 ?
		data.payload.successCodes : false;
	var timeoutSeconds = typeof(data.payload.timeoutSeconds) == 'number' &&
		data.payload.timeoutSeconds % 1 === 0 &&
		data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ?
		data.payload.timeoutSeconds : false;

	if (id && (protocol || url || method || successCodes || timeoutSeconds)) {
		// Lookup the check
		_data.read('checks', id, (err, checkData) => {
			if (! err && checkData) {
				// Get the token from the headers
				var token = typeof(data.headers.token) == 'string' ?
					data.headers.token : false;
				// Verify that the given token is valid and belongs to the user who created the check
				handlers._tokens.verifyToken(token, checkData.userPhone, tokenIsValid => {
					if (tokenIsValid) {
						// Update the check where necessary
						if (protocol) {
							checkData.protocol = protocol;
						}
						if (url) {
							checkData.url = url;
						}
						if (method) {
							checkData.method = method;
						}
						if (successCodes) {
							checkData.successCodes = successCodes;
						}
						if (timeoutSeconds) {
							checkData.timeoutSeconds = timeoutSeconds;
						}

						// Store the updates
						_data.update('checks', id, checkData, err => {
							if (! err) {
								callback(200);
							} else {
								callback(500, { 'Error': 'Could not update the check' });
							}
						});
					} else {
						callback(403);
					}
				});
			} else {
				callback(400, { 'Error': 'Check ID did not exist' });
			}
		});
	} else {
		callback(400, { 'Error': 'Missing required field' });
	}
};


// Checks - DELETE
// Required data: id
// Optional data: none
handlers._checks.delete = (data, callback) => {
	// Check that the phone number is valid
	var id = typeof(data.queryStringObject.id) == "string" &&
		data.queryStringObject.id.trim().length == 20 ?
		data.queryStringObject.id.trim() : false;

	if (id) {
		// Lookup the check
		_data.read('checks', id, (err, checkData) => {
			if (! err && checkData) {
				// Get the token from the headers
				var token = typeof(data.headers.token) == 'string' ?
					data.headers.token : false;

				// Verify that the given token is valid for the id number
				handlers._tokens.verifyToken(token, checkData.userPhone, tokenIsValid => {
					if (tokenIsValid) {
						// Delete the check
						_data.delete('checks', id, err => {
							if (! err) {
								// Lookup the user
								_data.read('users', checkData.userPhone, (err, userData) => {
									if (! err && userData) {
										var userChecks = typeof(userData.checks) == 'object' &&
											userData.checks instanceof Array ?
											userData.checks : [];

										// Remove the deleted check from their list of checks
										var checkPosition = userChecks.indexOf(id);

										if (checkPosition > -1) {
											userChecks.splice(checkPosition, 1);

											// Re-save the user's data
											_data.update('users', checkData.userPhone, userData, err => {
												if (! err) {
													callback(200);
												} else {
													callback(500, { 'Error': 'Could not delete check data' });
												}
											});
										} else {
											callback(500, { 'Error': 'Could not find the check on the users object, so could not remove it' });
										}
									} else {
										callback(400, { 'Error': 'Couldn\'t find the user who created the check' });
									}
								});
							} else {
								callback(500, { 'Error': 'Could not delete the check data' });
							}
						});
					} else {
						callback(403, { 'Error': 'Missing required token in header, or token is invalid' });
					}
				});
			} else {
				callback(400, { 'Error': 'Specified check did not exist' });
			}
		});

		
	} else {
		callback(400, { 'Error': 'Missing required field' });
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