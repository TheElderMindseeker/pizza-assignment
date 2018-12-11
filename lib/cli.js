/*
 *
 * This are CLI-related tasks
 */

// Dependencies
const readline = require('readline');
const util = require('util');
const debug = util.debuglog('cli');
const events = require('events');
class _events extends events {};
const e = new _events();
const _data = require('./data');
const helpers = require('./helpers');

// Instanciate the CLI module object
var cli = {};

// Input handlers

e.on('man', str => {
    cli.responders.help();
});

e.on('help', str => {
    cli.responders.help();
});

e.on('exit', str => {
    cli.responders.exit();
});

e.on('menu', str => {
    cli.responders.menu();
});

e.on('list recent orders', str => {
    cli.responders.listOrders(str);
});

e.on('more order info', str => {
    cli.responders.moreOrderInfo(str);
});

e.on('list recent users', str => {
    cli.responders.listUsers(str);
});

e.on('more user info', str => {
    cli.responders.moreUserInfo(str);
});

// Responders
cli.responders = {};

cli.responders.help = () => {
    var commands = {
        'exit': 'Kill the CLI (and the rest of the application)',
        'man': 'Show this help page',
        'help': 'Alias of the "man" command',
        'menu': 'View all current menu items',
        'list recent orders [--detailed]': 'View all the recent orders in the system (orders placed in the last 24 hours)',
        'more order info --{orderId}': 'Show details of the specific order',
        'list recent users [--detailed]': 'View all users who have signed up in the last 24 hours',
        'more user info --{userEmail}': 'Lookup details of a specific user by email address'
    }

    cli.horizontalLine();
    cli.centered('CLI Manual');
    cli.horizontalLine();
    cli.verticalSpace(2);

    for (var key in commands) {
        if (commands.hasOwnProperty(key)) {
            var value = commands[key];
            var line = '\x1b[33m' + key + '\x1b[0m'
            var padding = 60 - line.length;
            for (var i = 0; i < padding; i++) {
                line += ' ';
            }
            line += value;
            console.log(line);
            cli.verticalSpace();
        }
    }

    cli.verticalSpace();
    cli.horizontalLine();
};

cli.verticalSpace = lines => {
    lines = typeof(lines) == 'number' && lines > 0 ? lines : 1;
    for (var i = 0; i < lines; i++) {
        console.log('');
    }
};

cli.horizontalLine = () => {
    var width = process.stdout.columns;
    var line = '';
    for (var i = 0; i < width; i++) {
        line += '-';
    }
    console.log(line);
};

cli.centered = text => {
    text = typeof(text) == 'string' && text.trim().length > 0 ? text.trim() : '';
    var width = process.stdout.columns;
    var leftPadding = Math.floor((width - text.length) / 2);
    var line = '';
    for (var i = 0; i < leftPadding; i++) {
        line += ' ';
    }
    line += text;
    console.log(line);
};

cli.responders.exit = () => {
    process.exit(0);
};

cli.responders.menu = () => {
    _data.list('items', (err, itemList) => {
        if (! err && itemList && itemList.length > 0) {
            cli.verticalSpace();
            itemList.forEach(itemName => {
                _data.read('items', itemName, (err, itemData) => {
                    if (! err && itemData) {
                        var line = `Title: ${itemData.title} Price: ${itemData.price}`;
                        console.log(line);
                        cli.verticalSpace();
                    }
                });
            });
        }
    });
};

cli.responders.listOrders = str => {
    // The time with which all comparisons are made
    var thisMoment = Date.now();
    var detailed = str.indexOf('--detailed') > -1;

    _data.list('orders', (err, orderNames) => {
        if (! err && orderNames && orderNames.length > 0) {
            cli.verticalSpace();
            orderNames.forEach(orderName => {
                _data.read('orders', orderName, (err, orderData) => {
                    // Take only orders within 24 hours from now
                    if (! err && orderData
                        && thisMoment - orderData.timestamp <= 24 * 60 * 60 * 1000) {
                        orderData.orderName = orderName;

                        if (detailed) {
                            cli.verticalSpace();
                            console.dir(orderData, { colors: true });
                        } else {
                            var dateTime = new Date(orderData.timestamp).toISOString();
                            var line = `Customer: ${orderData.customer} Total price: ${orderData.totalPrice}$ Date/Time: ${dateTime}`;
                            line += ` (Order name: ${orderData.orderName})`;
                            console.log(line);
                        }
                        cli.verticalSpace();
                    }
                });
            });
        }
    });
};

cli.responders.moreOrderInfo = str => {
    var arr = str.split('--');
    orderName = typeof(arr[1]) == 'string' && arr[1].trim().length > 0 ? arr[1].trim() : false;

    if (orderName) {
        _data.read('orders', orderName, (err, orderData) => {
            if (! err && orderData) {
                cli.verticalSpace();
                console.dir(orderData, { 'colors': true });
                cli.verticalSpace();
            }
        });
    }
};

cli.responders.listUsers = str => {
    // The time with which all comparisons are made
    var thisMoment = Date.now();
    var detailed = str.indexOf('--detailed') > -1;

    _data.list('users', (err, userNames) => {
        if (! err && userNames && userNames.length > 0) {
            cli.verticalSpace();
            userNames.forEach(userName => {
                _data.read('users', userName, (err, userData) => {
                    // Take only users signed up within 24 hours from now
                    if (! err && userData
                        && thisMoment - userData.signUpDate <= 24 * 60 * 60 * 1000) {
                        if (detailed) {
                            cli.verticalSpace();
                            console.dir(userData, { colors: true });
                        } else {
                            var line = `Full Name: ${userData.fullName} Email Address: ${userData.emailAddress}`;
                            console.log(line);
                        }
                        cli.verticalSpace();
                    }
                });
            });
        }
    });
};

cli.responders.moreUserInfo = str => {
    var arr = str.split('--');
    userId = typeof(arr[1]) == 'string' && arr[1].trim().length > 0 ? arr[1].trim() : false;

    if (userId) {
        _data.read('users', userId, (err, userData) => {
            if (! err && userData) {
                cli.verticalSpace();
                console.dir(userData, { 'colors': true });
                cli.verticalSpace();
            }
        });
    }
};

// Input processor
cli.processInput = str => {
    str = typeof(str) == 'string' && str.trim().length > 0 ? str.trim() : false;
    // Only process the input if the user actually wrote something
    if (str) {
        var uniqueInputs = [
            'man',
            'help',
            'exit',
            'menu',
            'list recent orders',
            'more order info',
            'list recent users',
            'more user info'
        ];

        var matchFound = false;
        var counter = 0;

        uniqueInputs.some(input => {
            if (str.toLowerCase().indexOf(input) > -1) {
                matchFound = true;
                e.emit(input, str);
                return true;
            }
        });

        if (! matchFound) {
            console.log('Sorry, try again!');
        }
    }
}

// Init script
cli.init = () => {
    // Send the start message to the console in dark blue
    console.log('\x1b[34m%s\x1b[0m', 'The CLI is running');

    // Start the interface
    var _interface = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: ''
    });

    // Create an initial prompt
    _interface.prompt();

    // Handle each line of input separately
    _interface.on('line', str => {
        // Send to the input processor
        cli.processInput(str);

        // Re-initialize the prompt afterwards
        _interface.prompt();
    });

    // If the user stops the CLI, we need to kill the associated process
    _interface.on('close', () => {
        process.exit(0);
    });
};

module.exports = cli;