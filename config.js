/*
 * Create and export configuration variables
 *
 */

// Container for all the environments
var environments = {};

// Staging (defualt) environment
environments.staging = {
	'httpPort': 5080,
	'httpsPort': 5443,
	'envName': 'staging',
	'hashingSecret': 'PizzaDelivery',
	'stripeSecret': 'sk_test_qApaC5ELrRFQRxhRhn4bdMsM',
	'stripeTestToken': 'tok_visa_debit',
	'mailgunDomainName': 'sandbox31f67f12b2754edd9d90193a3d10347b.mailgun.org',
	'mailgunApiKey': 'b8280eb60d779204fe129bc8cea072b8-f45b080f-8eab5097'
};


// Production environment
environments.production = {
	'httpPort': 80,
	'httpsPort': 443,
	'envName': 'production',
	'hashingSecret': '1wwawqd4jx7cwskqfwgp',
	'stripeSecret': 'sk_test_qApaC5ELrRFQRxhRhn4bdMsM',
	'stripeTestToken': 'tok_visa_debit',
	'mailgunDomainName': 'sandbox31f67f12b2754edd9d90193a3d10347b.mailgun.org',
	'mailgunApiKey': 'b8280eb60d779204fe129bc8cea072b8-f45b080f-8eab5097'
};


// Decide which environment to export
var currentEnvironment = typeof(process.env.NODE_ENV) ==
	'string' ? process.env.NODE_ENV.toLowerCase() : 'staging';


// Check the existance of the specified environment in the config object
var environmentToExport = typeof(environments[currentEnvironment]) ==
	'object' ? environments[currentEnvironment] : environments.staging;


// Export the module
module.exports = environmentToExport;