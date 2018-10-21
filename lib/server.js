/*
 * Server related tasks
 *
 */

// Dependencies
const http = require('http');
const https = require('https');
const url = require('url');
const StringDecoder = require('string_decoder').StringDecoder;
const config = require('./../config');
const fs = require('fs');
const handlers = require('./handlers');
const helpers = require('./helpers');
const path = require('path');
const util = require('util');
const debug = util.debuglog('server');


// Instantiate the server module object
var server = {};


// Instantiating the http server
server.httpServer = http.createServer((req, res) => {
	server.unifiedServer(req, res);
});

// Set up the https server options
server.httpsServerOptions = {
	'key': fs.readFileSync(path.join(__dirname, './../https/key.pem')),
	'cert': fs.readFileSync(path.join(__dirname, './../https/cert.pem'))
};

// Instantiate the https server
server.httpsServer = https.createServer(server.httpsServerOptions, (req, res) => {
	server.unifiedServer(req, res);
});

// All the server logic for both the http and https server
server.unifiedServer = (req, res) => {

	// Get the url and parse it
	parsedUrl = url.parse(req.url, true);

	// Get the path from that url
	var path = parsedUrl.pathname;
	var trimmedPath = path.replace(/^\/+|\/+$/g, '');

	// Get the query string as an object
	var queryStringObject = parsedUrl.query;

	// Get the HTTP method
	var method = req.method.toLowerCase();

	// Get the headers as an object
	var headers = req.headers;

	// Get the payload, if there is
	var decoder = new StringDecoder('utf-8');
	var buffer = '';
	req.on('data', data => {
		buffer += decoder.write(data);
	});

	req.on('end', () => {
		buffer += decoder.end();

		// Choose a handler this request shoud go to
		// If no one is found, route to the notFound view
		var chosenHandler = typeof(server.router[trimmedPath]) !==
			'undefined' ? server.router[trimmedPath] : handlers.notFound;

		// If the request is within the public directory, use the public handler instead
		chosenHandler = trimmedPath.indexOf('public/') > -1 ? handlers.public : chosenHandler;

		// Construct a data object to send to the handler
		var data = {
			'trimmedPath': trimmedPath,
			'queryStringObject': queryStringObject,
			'method': method,
			'headers': headers,
			'payload': helpers.parseJsonToObject(buffer)
		};

		// Route the request to the chosen handler
		chosenHandler(data, (statusCode, payload, contentType) => {

			// Determine the type of response (fallback to JSON)
			contentType = typeof(contentType) == 'string' ? contentType : 'json';

			// Use the status code called back by the handler, or default
			statusCode = typeof(statusCode) == 'number' ? statusCode : 200;

			// Return the response parts that are content-specific
			var payloadString = '';
			if (contentType == 'json') {
				res.setHeader('Content-Type', 'application/json')
				payload = typeof(payload) == 'object' ? payload : {};
				payloadString = JSON.stringify(payload);
			}
			if (contentType == 'html') {
				res.setHeader('Content-Type', 'text/html')
				payloadString = typeof(payload) !== 'undefined' ? payload : '';
			}
			if (contentType == 'favicon') {
				res.setHeader('Content-Type', 'image/x-icon')
				payloadString = typeof(payload) !== 'undefined' ? payload : '';
			}
			if (contentType == 'css') {
				res.setHeader('Content-Type', 'text/css')
				payloadString = typeof(payload) !== 'undefined' ? payload : '';
			}
			if (contentType == 'png') {
				res.setHeader('Content-Type', 'image/png')
				payloadString = typeof(payload) !== 'undefined' ? payload : '';
			}
			if (contentType == 'jpg') {
				res.setHeader('Content-Type', 'image/jpeg')
				payloadString = typeof(payload) !== 'undefined' ? payload : '';
			}
			if (contentType == 'plain') {
				res.setHeader('Content-Type', 'text/plain')
				payloadString = typeof(payload) !== 'undefined' ? payload : '';
			}

			// Return the response-parts that are common to all content-types
			res.writeHead(statusCode);
			res.end(payloadString);

			// If the response is 200 print green, otherwise print red
			if (statusCode == 200) {
				debug('\x1b[32m%s\x1b[0m', method.toUpperCase() + ' /' + trimmedPath + ' ' + statusCode);
			} else {
				debug('\x1b[31m%s\x1b[0m', method.toUpperCase() + ' /' + trimmedPath + ' ' + statusCode);
			}
		});
	});
};


// Define a request router
server.router = {
	'': handlers.index,
	'ping': handlers.ping,
	'account/create': handlers.accountCreate,
	'account/edit': handlers.accountEdit,
	'account/deleted': handlers.accountDeleted,
	'session/create': handlers.sessionCreate,
	'session/deleted': handlers.sessionDeleted,
	'menu/list': handlers.menuList,
	'cart/list': handlers.cartList,
	'cart/create': handlers.cartCreate,
	'api/users': handlers.users,
	'api/tokens': handlers.tokens,
	'api/items': handlers.items,
	'api/menu': handlers.menu,
	'api/carts': handlers.cart,
	'api/order': handlers.order,
	'favicon.ico': handlers.favicon,
	'public': handlers.public
};


// Init function
server.init = () => {
	// Start the server, and have it listen on port 3000
	server.httpServer.listen(config.httpPort, () => {
		console.log('\x1b[36m%s\x1b[0m',
			`The server is listening on port ${config.httpPort}`);
	});

	// Start the https server
	server.httpsServer.listen(config.httpsPort, () => {
		console.log('\x1b[35m%s\x1b[0m',
			`The server is listening on port ${config.httpsPort}`);
	});
};


// Export the module
module.exports = server;