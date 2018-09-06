/*
 * Primary file for the API
 *
 */

 // Dependencies
 const server = require('./lib/server');


 // Declare the app
 const app = {};


 // Init function
 app.init = () => {
 	// Start the server
 	server.init();
 };


 // Execute the init function
 app.init();


 // Export the app
 module.exports = app;