/*
 * Library for storing and editing data
 *
 */

// Dependencies
const fs = require('fs');
const path = require('path');
const helpers = require('./helpers');


// Container for the module (to be exported)
const lib = {};


// Base directory of the data folder
lib.baseDir = path.join(__dirname, '/../.data/');


// Write data to file
lib.create = (dir, filename, data, callback) => {
	// Try to open the file for writing
	fs.open(lib.baseDir + dir + '/' + filename + '.json', 'wx',
		(err, fileDescriptor) => {
			if (! err && fileDescriptor) {
				// Convert data to string
				var stringData = JSON.stringify(data);

				// Write to file and close it
				fs.writeFile(fileDescriptor, stringData, err => {
					if (! err) {
						fs.close(fileDescriptor, err => {
							if (! err) {
								callback(false);
							} else {
								callback('Error closing file');
							}
						});
					} else {
						callback('Error writing to new file');
					}
				});
			} else {
				callback('Could not create a new file, it may already exist');
			}
		});
};


// Read data from file
lib.read = (dir, filename, callback) => {
	fs.readFile(lib.baseDir + dir + '/' + filename + '.json', 'utf8',
		(err, data) => {
			if (! err && data) {
				var parsedData = helpers.parseJsonToObject(data);
				callback(false, parsedData);
			} else {
				callback(err, data);
			}
		});
};


// Update data inside a file
lib.update = (dir, filename, data, callback) => {
	// Open the file for writing
	fs.open(lib.baseDir + dir + '/' + filename + '.json', 'r+',
		(err, fileDescriptor) => {
			if (! err && fileDescriptor) {
				// Convert data to the file
				var stringData = JSON.stringify(data);

				// Truncate the file
				fs.truncate(fileDescriptor, err => {
					if (! err) {
						// Write to the file and close it
						fs.writeFile(fileDescriptor, stringData, err => {
							if (! err) {
								fs.close(fileDescriptor, err => {
									if (! err) {
										callback(false);
									} else {
										callback('Error closing existing file');
									}
								})
							} else {
								callback('Error writing to existing file');
							}
						})
					} else {
						callback('Error truncating file');
					}
				})
			} else {
				callback('Could not open the file for updating, it may not exist yet');
			}
		});
};


// Delete a file
lib.delete = (dir, filename, callback) => {
	// Unlink the file
	fs.unlink(lib.baseDir + dir + '/' + filename + '.json', err => {
		if (! err) {
			callback(false);
		} else {
			callback('Error deleting file');
		}
	});
};


// List all files within a directory
lib.list = (dir, callback) => {
	fs.readdir(lib.baseDir + dir + '/', (err, data) => {
		if (! err && data && data.length > 0) {
			var trimmedFileNames = [];
			data.forEach(fileName => {
				trimmedFileNames.push(fileName.replace('.json', ''));
			});
			callback(false, trimmedFileNames);
		} else {
			callback(err, data);
		}
	});
};


// Export the module
module.exports = lib;