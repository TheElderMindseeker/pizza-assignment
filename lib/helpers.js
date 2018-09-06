/*
 * Helpers for various tasks
 *
 */

// Dependencies
const crypto = require('crypto');
const config = require('./../config');
const https = require('https');
const querystring = require('querystring');


// Container for all the helpers
var helpers = {};


// Hash helper
helpers.hash = str => {
	if (typeof(str) == "string" && str.length > 0) {
		var hash = crypto.createHmac('sha256', config.hashingSecret).update(str).digest('hex');
		return hash;
	} else {
		return false;
	}
};


// Parse a JSON string to an object in all cases, without throwing
helpers.parseJsonToObject = str => {
	try {
		var obj = JSON.parse(str);
		return obj;
	} catch(e) {
		return {};
	}
};


// Create a string of random alphanumeric charcters, of a given length
helpers.createRandomString = strLength => {
	strLength = typeof(strLength) == 'number' && strLength > 0 ? strLength : false;

	if (strLength) {
		// Define all possible characters that could go into a string
		var possibleCharacters = 'abcdefghijklmnopqrstuvwxyz0123456789';

		// Start the final string
		var str = '';
		for (i = 1; i <= strLength; i++) {
			// Get a random character from the possibleCharacters string
			var randomCharacter = possibleCharacters.charAt(
				Math.floor(Math.random() * possibleCharacters.length)
			);

			// Append this character to the final string
			str += randomCharacter;
		}

		// Return the final string
		return str;
	} else {
		return false;
	}
};


// Export the module
module.exports = helpers;