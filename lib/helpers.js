/*
 * Helpers for various tasks
 *
 */

// Dependencies
const crypto = require('crypto');
const config = require('./../config');
const https = require('https');
const querystring = require('querystring');
const fs = require('fs');
const path = require('path');


// Container for all the helpers
var helpers = {};


// Regular expression for emails
helpers.email_regexp = /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/


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


// Create a Stripe charge so as to allow user to pay for their order
helpers.createStripeCharge = (requestData, callback) => {
	// Pack request data into a query string
	var postData = querystring.stringify(requestData);

	// Populate request options object
	var requestOptions = {
		'method': 'POST',
		'hostname': 'api.stripe.com',
		'path': '/v1/charges',
		'auth': config.stripeSecret + ':',
		'headers': {
			'Content-Type': 'application/x-www-form-urlencoded',
			'Content-Length': Buffer.byteLength(postData)
		}
	};

	// Create request object
	req = https.request(requestOptions, res => {
		// Check that response carries success
		if (res.statusCode == 200 || res.statusCode == 201) {
			callback(false);
		} else {
			callback(`Status code returned from Stripe.com is ${res.statusCode}`);
		}
	});

	// Capture errors during request sending
	req.on('error', err => {
		callback(err);
	});

	// Send the payload of the request
	req.write(postData);

	// Finalize the request
	req.end();
};


// Sends user a receipt via email
helpers.sendMailReceipt = (emailAddress, receiptText, callback) => {
	// Pack request data into a query string
	var postData = querystring.stringify({
		'from': `Pizza Delivery <mailgun@${config.mailgunDomainName}>`,
		'to': `${emailAddress}`,
		'subject': 'Order Receipt',
		'html': receiptText
	});

	// Populate request options object
	var requestOptions = {
		'hostname': 'api.mailgun.net',
		'method': 'POST',
		'path': `/v3/${config.mailgunDomainName}/messages`,
		'auth': `api:${config.mailgunApiKey}`,
		'headers': {
			'Content-Type': 'application/x-www-form-urlencoded',
			'Content-Length': Buffer.byteLength(postData)
		}
	};

	// Create request object
	const req = https.request(requestOptions, res => {
		// Check that response carries success
		if (res.statusCode == 200 || res.statusCode == 201) {
			callback(false);
		} else {
			callback(`Status code returned from Mailgun.com is ${res.statusCode}`);
		}
	});

	// Capture errors during request sending
	req.on('error', err => {
		callback(err);
	});

	// Send the payload of the request
	req.write(postData);

	// Finalize the request
	req.end();
};


// Get the string content of a template
helpers.getTemplate = (templateName, data, callback) => {
	templateName = typeof(templateName) == 'string' && templateName.length > 0 ? templateName : false;
	data = typeof(data) == 'object' && data !== null ? data : {};

	if (templateName) {
		var templatesDir = path.join(__dirname, '/../templates/');
		fs.readFile(templatesDir + templateName + '.html', 'utf8', (err, str) => {
			if (! err && str && str.length > 0) {
				// Do interpolation on the string
				var finalString = helpers.interpolate(str, data);
				callback(false, finalString);
			} else {
				callback('No template could be found');
			}
		});
	} else {
		callback('A valid template name was not specified')
	}
};


// Add the universal header and footer to a string, and pass provided data object to the header and footer for interpolation
helpers.addUniversalTemplates = (str, data, callback) => {
	templateName = typeof(templateName) == 'string' && templateName.length > 0 ? templateName : false;
	data = typeof(data) == 'object' && data !== null ? data : {};

	// Get the header
	helpers.getTemplate('_header', data, (err, headerString) => {
		if (! err && headerString) {
			// Get the footer
			helpers.getTemplate('_footer', data, (err, footerString) => {
				if (! err && footerString) {
					// Add them together
					var fullString = headerString + str + footerString;
					callback(false, fullString);
				} else {
					callback('Could not find the footer template');
				}
			});
		} else {
			callback('Could not find the header template');
		}
	});
};


// Take a given string and a data object and find/replace all the keys within it
helpers.interpolate = (str, data) => {
	str = typeof(str) == 'string' && str.length > 0 ? str : '';
	data = typeof(data) == 'object' && data !== null ? data : {};

	// Add the template globals to the data object, prepending their key name with "global"
	for (var keyName in config.templateGlobals) {
		if (config.templateGlobals.hasOwnProperty(keyName)) {
			data['global.' + keyName] = config.templateGlobals[keyName];
		}
	}

	// For each key in the data object, insert its value into the string at the corresponding position
	for (var key in data) {
		if (data.hasOwnProperty(key) && typeof(data[key]) == 'string') {
			var replace = data[key];
			var find = '{' + key + '}';
			str = str.replace(find, replace);
		}
	}

	return str;
};


// Get the contents of a static (public) asset
helpers.getStaticAsset = (fileName, callback) => {
	fileName = typeof(fileName) == 'string' && fileName.length > 0 ? fileName : false;
	if (fileName) {
		var publicDir = path.join(__dirname, '/../public/');
		fs.readFile(publicDir + fileName, (err, data) => {
			if (! err && data) {
				callback(false, data);
			} else {
				callback('No file could be found');
			}
		})
	} else {
		callback('A valid file name was not specified');
	}
};


// Export the module
module.exports = helpers;