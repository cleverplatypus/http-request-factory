import ConsoleLogger from './ConsoleLogger.ts';
import ILogger from './ILogger.ts';
import { TEXT_TYPES } from './constants.ts';
import HTTPError from './HTTPError.ts';
import {
  HeaderValue,
  HTTPMethod,
  LogLevel,
  QueryParameterValue,
  RequestConfig,
  ResponseHandler,
  ResponseInterceptor,
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
      ignoreResponseBody : false,
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
        if(this.config.ignoreResponseBody || response.status === 204) {
          return;
        }
        return await this.readResponse(response);
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

  withMeta(param1: string | Record<string, any>, param2?: any) {
    if (typeof param1 === 'string') {
      this.config.meta[param1] = param2;
    } else if (typeof param1 === 'object') {
      Object.assign(this.config.meta, param1);
    }
    return this;
  }

  withLogger(logger: ILogger) {
    this.logger = logger;
  }

  withCredentialsPolicy(config: RequestCredentials): HTTPRequest {
    this.config.credentials = config;
    return this;
  }

  withUriEncodedBody() {
    this.config.uriEncodedBody = true;
    return this;
  }

  blank() {
    this.configBuilders.splice(0, this.configBuilders.length);
    return this;
  }

  withAccept(...mimeTypes) {
    this.config.acceptedMIMETypes = mimeTypes;
    return this;
  }

  withURLParam(name: string, value: string) {
    this.config.urlParams[name] = value;
    return this;
  }

  withURLParams(params: Record<string, QueryParameterValue>) {
    Object.assign(this.config.urlParams, params);
    return this;
  }

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

  withAcceptAny() {
    this.config.acceptedMIMETypes = ['*/*'];
    return this;
  }

  ignoreResponseBody(){
    this.config.ignoreResponseBody = true;
    return this;
  }

  withQueryParams(params: Record<string, QueryParameterValue>) {
    Object.assign(this.config.queryParams, params);
    return this;
  }

  withNoCors() {
    this.config.corsMode = 'no-cors';
    return this;
  }
  withQueryParam(name: string, value: QueryParameterValue) {
    this.config.queryParams[name] = value;
    return this;
  }

  /**
   *
   * @param {String} level the log level to apply for this request. One of LOG_LEVEL_ERROR, LOG_LEVEL_WARN, LOG_LEVEL_INFO, LOG_LEVEL_DEBUG defined in constants.js
   * Overrides the default log level.
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
   */
  withHeaders(headers: Record<string, HeaderValue>) {
    if (typeof headers === 'object') {
      Object.assign(this.config.headers, headers);
    }
    return this;
  }

  /**
   *
   * @param {String} name header name
   * @param {*} value the value for the header, omit this parameter to remove the header
   */
  withHeader(name: string, value: HeaderValue) {
    this.config.headers[name] = value;
    return this;
  }

  /**
   *
   * @param {Number} timeout milliseconds to wait before failing the request as timed out
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
   */
  withResponseInterceptor(handler: ResponseInterceptor): HTTPRequest {
    this.config.responseInterceptor = handler;
    return this;
  }

  get meta() {
    return this.config.meta;
  }
}
