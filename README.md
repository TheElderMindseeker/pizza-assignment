# Pizza Delivery RESTful JSON API

This application is a homework assignment for the pure Node.js course at pirple.thinkific.com

The application is a HTTP/HTTPS server that implements an JSON API and simple web interface for the Pizza Delivery company. The application allows
creating and managing users, logging them in and out and, creating and managing virtual shopping carts (one per user) and
making orders and online payment. Application also sends a receipt to user's account for each successful order. There are though some limitations on using
the app's functionality connected with emailing (see Limitations section).

## Interface

### Web Interface

The application serves web content on some of its routes. To enter the web interface part of the application, proceed to `http(s)://localhost/` using the port that the server started on (see Configuration section).
The web interface uses the classical combination of HTML/CSS/JS to enable not so wonderful user experience which is still more convinient than bare JSON API.

### JSON API

The application as a REST API server has its base URL, derived from where it's run. If, for example, the server is run on
local machine, base URL will be `http(s)://localhost/api/`. For particular port see Configuration section. Application has got
several sub-functionalities such as users and tokens, each is working on separate sub-URL. Each functionality supports only
HTTP methods listed below, and if a user tries to access the endpoints using other methods they will get 405 error.

For GET methods, parameters are needed to be passed using URL-encoded string after the `?` sign in URL basepath. For other
available methods, a user needs to use the body section of the request.

### Users

Sub-URL: `/users`

* POST. Introduces new user into the system.
* GET. Gets the information about current user.
* PUT. Updates the information about current user.
* DELETE. Deletes the user from the system

### Tokens

Sub-URL: `/tokens`

* POST. Acquire new token for the user.
* GET. Get the data of token with specified id.
* PUT. Extend the expiration period of the current token.
* DELETE. Delete the token and thus log out user from the system.

### Items

Sub-URL: `/items`

* POST. Create new item on menu, featuring title and price.
* GET. Get the information about specific item.
* PUT. Update the information about specific item.
* DELETE. Delete chosen item from the database.

### Menu

Sub-URL: `/menu`

* GET. Get all pizzas the restaurant serves and information about them.

### Shopping Cart

Sub-URL: `/carts`

* POST. Create new shopping cart for the current user.
* GET. Get the information on the shopping cart of the current user.
* PUT. Update the shopping cart of the current user.
* DELETE. Purge the shopping cart of the current user.

### Ordering

Sub-URL: `/order`

* POST. Make a payment on the order currently stored in shopping cart.

## Configuration

Server can be launched in either `testing` or `production` environment with the corresponding string specified in NODE_ENV
environment variable. Testing server runs on ports 5080/5443 for HTTP/HTTPS correspondingly. Production changes this to
ports 80/443 which are standard ports for those protocols. The SSL certificate was generated via openssl lib and self-signed.

## Limitations

Due to the limitations of Mailgun demo account, only daniil.botnarenku@gmail.com can receive the mail from the application.

Also because of security requirements of Mailgun, the Mailgun API key is stored in environmental variable `MAILGUN_API_KEY`
which is dynamically loaded in `config.js` during application start-up. Without this key the application will work, but the emails
would not be sent.