import deepFreeze from 'deep-freeze-strict';
import ConsoleLogger from './ConsoleLogger.ts';
import { TEXT_TYPES } from './constants.ts';
import HTTPError from './HTTPError.ts';
import ILogger from './ILogger.ts';
import {
  HeaderValue,
  HTTPMethod,
  LogLevel,
  QueryParameterValue,
  RequestConfig,
  ResponseBodyTransformer,
  ResponseInterceptor
} from './types.ts';

/**
 * HTTP Request. This class shouldn't be instanciated directly.
 * Use {@link HTTPRequestFactory} createXXXRequest() instead
 */
export class HTTPRequest {
  private configBuilders: Function[];
  private wasUsed: boolean = false;
  private logger: ILogger = new ConsoleLogger();
  private config: RequestConfig;
  private timeoutID?: any;
  private fetchBody: RequestInit | null = null;
  /**
   * Returns the fetch response content in its appropriate format
   * @param {Response} response
   */
  private readResponse = async (response: Response): Promise<any> => {
    const contentType = response.headers.get('content-type')?.split(/;\s?/)[0];
    if (!contentType) {
      this.getLogger().info(`No content-type header found for response`);
      return null;
    }
    if (/^application\/json/.test(contentType)) {
      return await response.json();
    }

    if (TEXT_TYPES.find((type) => new RegExp(type).test(contentType))) {
      return await response.text();
    }

    return await response.blob();
  };

  constructor(
    url: string,
    method: HTTPMethod,
    defaultConfigBuilders: Function[]
  ) {
    this.configBuilders = defaultConfigBuilders;
    this.wasUsed = false;
    this.config = {
      url,
      headers: {},
      body: null,
      timeout: 0,
      ignoreResponseBody: false,
      uriEncodedBody: false,
      method,
      credentials: 'same-origin',
      logLevel: 'error',
      corsMode: 'cors',
      meta: {},
      queryParams: {},
      expectedResponseFormat: 'auto',
      acceptedMIMETypes: ['*/*'],
      urlParams: {},
    };
  }

  private getLogger() {
    return this.logger.withLevel(this.config.logLevel);
  }

  private setupHeaders() {
    const headers = this.config.headers;
    for (let n in headers) {
      if (typeof headers[n] === 'function') {
        headers[n] = (headers[n] as Function)(this);
      }
      headers[n] ?? delete headers[n];
    }
    this.fetchBody!.headers = headers as HeadersInit;
  }

  private setupTimeout() {
    if (this.config.timeout) {
      const controller = new AbortController();
      this.timeoutID = setTimeout(() => {
        this.getLogger().debug(
          'HttpRequestFactory : Fetch timeout',
          `Request timeout after ${this.config.timeout / 1000} seconds`
        );
        controller.abort();
      }, this.config.timeout);
      this.fetchBody!.signal = controller.signal;
    }
    this.getLogger().debug(
      'HttpRequestFactory : Fetch invoked',
      this.fetchBody
    );
  }

  private setupQueryParams() {
    if (Object.keys(this.config.queryParams).length) {
      const params = new URLSearchParams();
      for (let k in this.config.queryParams) {
        params.set(k, this.config.queryParams[k]);
      }
      this.config.url = `${this.config.url}?${params.toString()}`;
    }
  }

  private setupBody() {
    if (this.config.body && this.config.uriEncodedBody) {
      this.logger.trace(
        'HttpRequestFactory : URI-Encoding body',
        this.config.body
      );
      this.config.body = encodeURIComponent(this.config.body);
    }
    this.fetchBody.body = this.config.body;
  }

  private setupURL() {
    for (const key in this.config.urlParams) {
      const value = this.config.urlParams[key];
      this.config.url = this.config.url.replace(
        `{{${key}}}`,
        typeof value === 'function' ? (value as Function)(this) : value
      );
    }
  }

  /**
   * Executes the fetch request and returns a Promise that resolves with the parsed result.
   *
   * @return {Promise<any>} A Promise that resolves with the result of the request.
   */
  async execute(): Promise<any> {
    if (this.wasUsed) {
      throw new Error(
        'HttpRequests cannot be reused. Please call a request factory method for every new call'
      );
    }
    const logger = this.getLogger();

    this.configBuilders.forEach((config) => {
      config(this);
    });

    this.fetchBody = {
      method: this.config.method,
      mode: this.config.corsMode,

      credentials: this.config.credentials,
    };

    this.setupHeaders();

    this.setupTimeout();

    this.setupQueryParams();

    this.setupBody();

    this.setupURL();

    this.wasUsed = true;

    let response;
    try {
      logger.debug(
        'HttpRequestFactory : Fetch url to be called',
        this.config.url
      );
      response = await fetch(this.config.url, this.fetchBody);

      logger.trace('HttpRequestFactory : Fetch response', response);

      if (this.config.responseInterceptor) {
        const interceptorResponse = await this.config.responseInterceptor(
          response,
          this
        );
        if (interceptorResponse !== undefined) {
          return interceptorResponse;
        }
      }
      if (response.ok) {
        if (this.config.ignoreResponseBody || response.status === 204) {
          return;
        }
        const body = await this.readResponse(response);
        if (this.config.responseBodyTransformer) {
          return this.config.responseBodyTransformer(body, this);
        }
        return body;
      } else {
        return Promise.reject(
          new HTTPError(
            response.status,
            response.statusText,
            await this.readResponse(response)
          )
        );
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        return Promise.reject(new HTTPError(-1, 'Request aborted'));
      }
      logger.error('HttpRequestFactory : Fetch error', {
        type: 'fetch-error',
        endpoint: this.config.url,
        details: error,
      });
      return Promise.reject(error);
    } finally {
      clearTimeout(this.timeoutID);
    }
  }

  /**
   * Retrieves a read-only copy of configuration.
   *
   * @return {type} The frozen configuration object.
   */
  getConfig() {
    return deepFreeze(this.config);
  }

  /**
   * Configures the request with metadata that can be inspected later.
   *
   * @param {string | Record<string, any>} param1 - The key or object containing the key-value pairs to update the meta property.
   * @param {any} [param2] - The value to associate with the key when param1 is a string.
   * @return {this} - Returns the current object instance for method chaining.
   */
  withMeta(param1: string | Record<string, any>, param2?: any) {
    if (typeof param1 === 'string') {
      this.config.meta[param1] = param2;
    } else if (typeof param1 === 'object') {
      Object.assign(this.config.meta, param1);
    }
    return this;
  }

  /**
   * Sets an ILogger compatible logger for the request. Normally the logger will be set by the factory.
   *
   * @param {ILogger} logger - The logger to be set.
   * @return {HTTPRequest} - The updated HTTP request instance.
   */
  withLogger(logger: ILogger) {
    this.logger = logger;
    return this;
  }

  /**
   * Sets the credentials policy for the HTTP request.
   *
   * @param {RequestCredentials} config - The configuration for the credentials.
   * @return {HTTPRequest} - The updated HTTP request instance.
   */
  withCredentialsPolicy(config: RequestCredentials): HTTPRequest {
    this.config.credentials = config;
    return this;
  }

  /**
   * Sets the `uriEncodedBody` property of the config object to `true`.
   * This function is used to indicate that the body of the request should be URL encoded.
   *
   * @return {HTTPRequest} - The updated instance of the class.
   */
  withUriEncodedBody() {
    this.config.uriEncodedBody = true;
    return this;
  }

  /**
   * Clears the config builders array and returns the instance.
   * Useful in cases where you want to create a new request that doesn't inherit
   * from API/factory settings that might have headers or other unwanted configuration
   *
   * @return {HTTPRequest} the updated request
   */
  blank() {
    this.configBuilders.splice(0, this.configBuilders.length);
    return this;
  }

  /**
   * Sets the accepted MIME types for the request.
   *
   * @param {...string} mimeTypes - An array of MIME types to accept.
   * @return {HTTPRequest} - The updated request instance.
   */
  withAccept(...mimeTypes) {
    this.config.acceptedMIMETypes = mimeTypes;
    return this;
  }

  /**
   * Adds a URL parameter to the request configuration.
   *
   * @param {string} name - The name of the URL parameter.
   * @param {string} value - The value of the URL parameter.
   * @return {HTTPRequest} - The updated request instance.
   */
  withURLParam(name: string, value: string) {
    this.config.urlParams[name] = value;
    return this;
  }

  /**
   * Assigns multiple query params to the request configuration.
   *
   * @param {Record<string, QueryParameterValue>} params - The URL parameters to assign.
   * @return {HTTPRequest} - The updated request instance.
   */
  withURLParams(params: Record<string, QueryParameterValue>) {
    Object.assign(this.config.urlParams, params);
    return this;
  }

  /**
   * Set the request body as a JSON object or string.
   *
   * @param {any} json - The JSON object or string to set as the request body.
   * @return {HTTPRequest} - The updated request instance.
   */
  withJSONBody(json: any) {
    this.withHeader('content-type', 'application/json');
    switch (typeof json) {
      case 'string':
        try {
          JSON.parse(json);
          this.config.body = json;
          return this;
        } catch {
          //do nothing. logging below
        }
        break;
      case 'object':
        this.config.body = JSON.stringify(json);
        return this;
    }
    this.getLogger().error(
      'POSTHttpRequest.withJSONBody',
      'Passed body is not a valid JSON string',
      json
    );
    return this;
  }

  /**
   * Short-hand for setting the accepted MIME types to ['*\/*'] which means the API accepts any MIME type.
   *
   * @return {Object} - The current object instance.
   */
  withAcceptAny() {
    this.config.acceptedMIMETypes = ['*/*'];
    return this;
  }

  /**
   * When called, the request will not try to parse the response
   *
   * @return {HTTPRequest} - The updated request instance.
   */
  ignoreResponseBody() {
    this.config.ignoreResponseBody = true;
    return this;
  }

  /**
   * Adds multiple query parameters to the existing query parameters
   * of the API configuration.
   *
   * @param {Record<string, QueryParameterValue>} params - The query parameters
   * to be added.
   * @return {HTTPRequest} - The updated request instance.
   */
  withQueryParams(params: Record<string, QueryParameterValue>) {
    Object.assign(this.config.queryParams, params);
    return this;
  }

  /**
   * Sets the CORS mode to 'no-cors' and returns the current object.
   *
   * @return {Object} - The current object.
   */
  withNoCors() {
    this.config.corsMode = 'no-cors';
    return this;
  }
  
  /**
   * Adds a query parameter to the request.
   *
   * @param {string} name - The name of the query parameter.
   * @param {QueryParameterValue} value - The value of the query parameter.
   * @return {HTTPRequest} - The updated request instance.
   */
  withQueryParam(name: string, value: QueryParameterValue) {
    this.config.queryParams[name] = value;
    return this;
  }

  /**
   *
   * @param {String} level the log level to apply for this request. One of LOG_LEVEL_ERROR, LOG_LEVEL_WARN, LOG_LEVEL_INFO, LOG_LEVEL_DEBUG defined in constants.js
   * Overrides the default log level.
   * @return {HTTPRequest} - The updated request instance.
   */
  withLogLevel(level: LogLevel) {
    this.config.logLevel = level;
    return this;
  }

  /**
   * Sets the request's Accept header to 'application/json'
   */
  acceptJSON() {
    this.config.acceptedMIMETypes = ['application/json'];
    return this;
  }

  /**
   * @param {Object} headers name-value pairs to set as headers
   * If value is undefined, the corresponding header will be removed if present
    * @return {HTTPRequest} - The updated request instance.
  */
  withHeaders(headers: Record<string, HeaderValue>) {
    if (typeof headers === 'object') {
      Object.assign(this.config.headers, headers);
    }
    return this;
  }

  /**
   * Sets the response body transformer for the request. The provided function will be called
   * after the request body is parsed.
   * This is especially useful when used in conjuncion with APIs definition
   * to hide some data massaging logic specific to the api.
   *
   * @param {ResponseBodyTransformer} transformer - The function to transform the body.
   * @param {HTTPRequest} request - The HTTP request object.
   * @return {object} - The updated instance of the class.
   * 
   * @example
   * factory.withAPIConfig({
   *    name : 'some-api',
   *    responseBodyTransformer : (body, request) => {
   *         //the response.details is a JSON string that we want 
   *         //to parse before the app receives the response
   *         body.details = JSON.parse(body.details)
   *         return body;
   *    }),
   *    endpoints : {
   *       'get-stuff' : {
   *          endpoint : '/get-stuff'
   *       }
   *    }
   * };
   *  
   * const response = factory
   *    .createAPIRequest('some-api', 'get-stuff')
   *    .execute();
   * console.log(response.details.some.deep.data);
   */
  withResponseBodyTransformer(transformer: ResponseBodyTransformer) {
    this.config.responseBodyTransformer = transformer;
    return this;
  }

  /**
   *
   * @param {String} name header name
   * @param {*} value the value for the header, omit this parameter to remove the header
   * @return {HTTPRequest} - The updated request instance.
   */
  withHeader(name: string, value: HeaderValue) {
    this.config.headers[name] = value;
    return this;
  }

  /**
   *
   * @param {Number} timeout milliseconds to wait before failing the request as timed out
    * @return {HTTPRequest} - The updated request instance.
  */
  withTimeout(timeout: number) {
    this.config.timeout = timeout;
    return this;
  }

  /**
   *
   * @param {Function} handler a callback function to process the raw response coming from the Fetch API.
   * This can be defined if, to override the default behaviour for HTTP status handling.
   * The callback signature is `function(response:Object, requestObj:HttpRequest)`
   * @return {HTTPRequest} - The updated request instance.
   */
  withResponseInterceptor(handler: ResponseInterceptor): HTTPRequest {
    this.config.responseInterceptor = handler;
    return this;
  }

  /**
   * Get the meta data that was set on the request.
   *
   * @return {Object} The meta data of the object.
   */
  get meta() {
    return this.config.meta;
  }
}
