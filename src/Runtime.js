'use strict';

const HttpEvent = require('./HttpEvent');
const morgan = require('morgan');
const express = require('express');
const cookieParser = require('cookie-parser');

/**
 * Runtime Class instantiates Express.js server
 */
class Runtime {

  /**
   * Runtime constructor
   *
   * @param serverless
   * @param options
   */
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;
  }

  /**
   * Instantiate express.js server
   */
  run() {
    process.env.IS_OFFLINE = true;

    this.app = express();
    this.app.use(cookieParser());
    this.app.use(this.requestBodyMiddleware);
    this.app.use(morgan(':method :url :status :res[content-length] [:response-time ms]'));

    this.serverless.service.getAllFunctions().forEach((name) => {
      const functionObj = this.serverless.service.getFunction(name);
      if (functionObj.events) {
        functionObj.events.forEach(event => {
          if (event.http) {
            const httpEvent = new HttpEvent(this.serverless, name, event.http);
            httpEvent.setFunctionHandler(functionObj.handler);

            const endpointPath = httpEvent.getHttpPath();
            const endpointMethod = httpEvent.getHttpMethod();
            const paddedMethod = this.padMethod(endpointMethod);

            this.serverless.cli.log(`Routing ${paddedMethod} ${endpointPath} via λ ${name}`);

            this.app[endpointMethod](endpointPath, httpEvent.route.bind(httpEvent));
          }
        });
      }
    });

    this.app.listen(this.options.port, (e) => {
      this.serverless.cli.log(e || `serverless-local listening on port ${this.options.port}`);
    });
  }

  /**
   * Middleware which puts together request body.
   *
   * @param {Object} request
   * @param {Object} response
   * @param {Function} next
   */
  requestBodyMiddleware(request, response, next) {
    request.body = null;
    request.setEncoding('utf8');

    request.on('data', (chunk) => {
      if (request.body === null) {
        request.body = '';
      }
      request.body += chunk;
    });

    request.on('end', next);
  }

  /**
   * Pad a method string with appropriate number of spaces
   * @param {String} string
   * @returns {*}
   */
  padMethod(string) {
    return (string.length >= 7) ? string : this.padMethod(`${string} `);
  }
}

module.exports = Runtime;
