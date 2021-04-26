/**
 * Import the following
 * Express - the express server
 * cookie-parser - cookie-parser is a middleware which parses cookies attached to the client request object.
 * express-sessi on - The session middleware handles all things for us, i.e., creating the session, setting the session cookie and creating the session object in req object.
 * @okta/oidc-middleware - This package makes it easy to get your users logged in with Okta using OpenId Connect (OIDC).
 * axios - Promise based HTTP client for the browser and node.js.
 */
const express = require('express');
const cookieParser = require('cookie-parser')
const session = require('express-session');
const { ExpressOIDC } = require('@okta/oidc-middleware');
const axios = require('axios');
/**
 * Load your app credentials stored in the .env file, 
 * i.e use process.env.VARIABLE_NAME to access the value of the variable defined in .env
 */
require('dotenv').config()

// Create app level object of Express JS
const app = express();
// Define a port for the server 
const port = 5000;

/**
 * Create an instance of the okta middleware by passing the following details in a dict object:
 * issuer - The OIDC provider (e.g. https://{yourOktaDomain}/oauth2/default)
 * client_id - An id provided when you create an OIDC app in your Okta Org (This is loaded from the .env file)
 * client_secret - A secret provided when you create an OIDC app in your Okta Org (This is loaded from the .env file)
 * appBaseUrl - The base scheme, host, and port (if not 80/443) of your app, not including any path (e.g. http://localhost:8080, not http://localhost:8080/ )
 * scope - the scope required is openid
 * routes - This object is used to define the custom routes we will be using for the app
 * the default values for the routes are:
 * - for login - '/login'
 * - for callback - '/authorization-code/callback'
 * - for logout - '/logout' you should send a POST request to this using requests/axios not a GET request and okta will destroy the session on their server,
 *   as for the local session it should be destroyed using req.logout()
 */
const oidcConfig = {
  issuer: process.env.OKTA_ISSUER,
  client_id: process.env.OKTA_CLIENT_ID,
  client_secret: process.env.OKTA_CLIENT_SECRET,
  appBaseUrl: 'http://localhost:5000',
  scope: 'openid profile',
  routes: {
    loginCallback: {
      // handled by this module (middleware)
      path: '/okta/callback',
      handler: (req, res, next) => {
        try {
          // Perform custom logic before final redirect, then call next()
          next()
        }
        catch (error) {
          console.log(error)
        }
      },
      /**
       * handled by your application - app.get('/face', callback)
       * After successful login the user will land on this url
       */
      afterCallback: '/face'
    },
    logout: {
      // handled by this module (middleware)
      path: '/okta/logout',
      handler: (req, res, next) => {
        
        /**
         * Send a post request to the logout uri using axios and then clear the local session
         * using req.logout() after that use next() to redirect the user back to them login/homepage
         */
        try {
          axios.post("http://localhost:5000/logout")
            .then(data => res.status(200).send(data))
            .catch(err => res.send(err));
          req.logout();
          next()
        }
        catch (err) {
          console.error("Ran into an error: ", err);
        }
      },
    },
    logoutCallback: {
      // After successful logout user will be redirect to the following path
      path: '/'
    }
  }
};
const oidc = new ExpressOIDC(oidcConfig);

/**
 * Set the view engine, here we are using ejs for rendering the html files
 * The html files should be stored in views folder and the static assets like css and js files should be stored in public folder
 */
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');
// Enable the express-session by creating an instance and passing it to app.use 
app.use(session({
  secret: 'secretss', // Load from .env in production
  resave: true,
  saveUninitialized: false
}))
// Enable the oidc router to be used in express
app.use(oidc.router);
// Enable cookie-parser for express
app.use(cookieParser());
// Define the static folder where your static files are/will be stored
app.use(express.static('public'));

// Base page to give the okta auth option
app.get('/', (req, res) => {
  res.send('<h1> ButterScotch</h1><a href="/login">Okta Authentication</a>');
})

/**
 * Callback for okta
 * On successful callback the oidc app will execute the handler and then using next() the control
 * will be passed down to this route function.
 * Redirect the user after successful callback
 */
app.get('/okta/callback',
  (req, res, next) => {
    res.redirect('/face')
  }
);

/**
 * The face rec page is the page where user is taken to after successful authentication,
 * we ensure the user is authenticated using oidc's ensureAuthenticated().
 * If the user tries to access this route without authentication,
 * he/she will be redirected to the okta login uri for authentication.
 */
app.get('/face', oidc.ensureAuthenticated(), (req, res) => {
  res.render('face')
})

/**
 * Defining a middleware for error handling
 * In the following function we check if the user is trying to access with invalid access
 * tokens and then redirecting the user to the base page for authentication
 */
let invalidTokenAccessErrorHandling = function (err, req, res, next) {
  if (!res.headersSent) {
    console.log('Invalid Token',err)
    if (err.message == 'did not find expected authorization request details in session, req.session["oidc:https://dev-21979561.okta.com/oauth2/default"] is undefined') {
    res.redirect('/');
    }
  }
}
// Add the middleware function created above by using app.use and pass the function
app.use(invalidTokenAccessErrorHandling);
// Start the express app inside oidc to prevent race condition
oidc.on('ready', () => {
  app.listen(port, () => console.log('server up and running'));
});
// This is triggered if an error occurs in oidc 
oidc.on('error', err => {
  console.log('An error occured while starting IODC: ', err);
});