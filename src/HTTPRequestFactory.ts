import ConsoleLogger from './ConsoleLogger.ts';
import { HTTPRequest } from './HTTPRequest.ts';
import ILogger from './ILogger.ts';
import {
  APIConfig,
  HeaderValue,
  Endpoint,
  HTTPMethod,
  LogLevel,
  ResponseBodyTransformer,
  ErrorInterceptor,
} from './types.ts';

function getEndpointURL(endpoint: Endpoint, api: APIConfig) {
  if (/^(https?:)?\/\//.test(endpoint.target)) {
    return endpoint.target;
  }
  let base: string | null = null;
  if (api.baseURL) {
    base =
      typeof api.baseURL === 'function' ? api.baseURL(endpoint) : api.baseURL;
  }

  return base ? `${base}${endpoint.target}` : endpoint.target;
}

/**
 * A factory for creating {@link HTTPRequest} instances.
 * It can be configured with defaults, logging options as well as
 * conditional settings using {@link when} in a method-chain fashion.
 */
export class HTTPRequestFactory {
  private requestDefaults: Function[] = [];
  private apiConfigs: { [key: string]: APIConfig } = {};
  private logger: ILogger = new ConsoleLogger();
  private logLevel: LogLevel = 'error';

  /**
   * Resets any conditions in the method chain set by {@link when}
   * @returns {HTTPRequestFactory} the factory instance
   */
  always() {
    return this;
  }

  /**
   * Adds a condition for the application of method-chain settings.
   * It can be reset by calling {@link always}
   *
   * @param {function} condition - A function that takes a HTTPRequest object and returns whether or not to apply the condition.
   * @return {HTTPRequestFactory} - A proxy to the factory instance that allows the conditional configuration
   *
   * @example
   * factory
   *  .when((request) => request.meta.requiresAuth)
   *  .withHeader('Authorization', 'some-token')
   *  .always()
   *  .withHeader('X-PoweredBy', 'Me')
   */
  when(condition: (request: HTTPRequest) => boolean) {
    const proxy = new Proxy(this, {
      get: (target, prop) => {
        if (prop === 'always') {
          return () => target;
        }

        if (prop === 'when') {
          return (condition: (request: HTTPRequest) => boolean) =>
            target.when(condition);
        }

        if (typeof target[prop] !== 'function') {
          return target[prop];
        }

        return (...args) => {
          const config = (request: HTTPRequest) => {
            if (condition(request)) {
              request[prop](...args);
            }
          };
          target.requestDefaults.push(config);
          return this;
        };
      },
    });

    return proxy;
  }

  /**
   * Sets the logger adapter for the instance for every request created.
   * By default the logger will be set by the factory to the internal `ConsoleLogger` adapter.
   *
   * @param {ILogger} logger - The logger to set.
   * @returns {HTTPRequestFactory} the factory instance
   */
  withLogger(logger: ILogger) {
    this.logger = logger;
    this.requestDefaults.push((request: HTTPRequest) =>
      request.withLogger(logger)
    );
    return this;
  }

  /**
   * Adds {@link APIConfig} configurations that can be consumed by calling {@link createAPIRequest}.
   *
   * @param {...APIConfig } apis - A list of {@link APIConfig} configurations.
   * @returns {HTTPRequestFactory} the factory instance
   */
  withAPIConfig(...apis: Array<APIConfig>) {
    apis.forEach((api) => {
      this.apiConfigs[api.name] = api;
    });
    return this;
  }

  /**
   * Adds the specified MIME types to the accept header to the factory defaults.
   *
   * @param {...string} mimeTypes - An array of MIME types to be added to the accept header.
   * @returns {HTTPRequestFactory} the factory instance
   */
  withAccept(...mimeTypes: Array<string>) {
    this.requestDefaults.push((request: HTTPRequest) =>
      request.withAccept(mimeTypes)
    );
    return this;
  }
  /**
   * Adds the specified header to the factory defaults.
   *
   * @param {string} key - The key of the header.
   * @param {string | ((request: HTTPRequest) => string)} value - The value of the header.
   * @returns {HTTPRequestFactory} the factory instance
   */
  withHeader(key: string, value: string | ((request: HTTPRequest) => string)) {
    this.requestDefaults.push((request: HTTPRequest) =>
      request.withHeader(key, value)
    );
    return this;
  }

  /**
   * Sets the credentials policy for the factory defaults.
   *
   * @param {RequestCredentials} config - The credentials policy to be set.
   * @returns {HTTPRequestFactory} the factory instance
   */
  withCredentialsPolicy(config: RequestCredentials) {
    this.requestDefaults.push((request: HTTPRequest) =>
      request.withCredentialsPolicy(config)
    );
    return this;
  }

  /**
   * Sets the log level to the factory defaults.
   *
   * @param {LogLevel} level - The log level to be set.
   * @returns {HTTPRequestFactory} the factory instance
   */
  withLogLevel(level: LogLevel) {
    this.logLevel = level;
    this.requestDefaults.push((request: HTTPRequest) =>
      request.withLogLevel(level)
    );
    return this;
  }

  /**
   * Adds a response body transformer to the factory defaults.
   *
   * @param {ResponseBodyTransformer} transformer - The function that will be used to transform the response body.
   * @returns {HTTPRequestFactory} the factory instance
   */
  withResponseBodyTransformer(
    transformer: (body: any, request: HTTPRequest) => any
  ) {
    this.requestDefaults.push((request: HTTPRequest) =>
      request.withResponseBodyTransformer(transformer)
    );
    return this;
  }

  /**
   * Adds the provided headers to the factory defaults.
   *
   * @param {Record<string, HeaderValue>} headers - The headers to be added to the request.
   * @returns {HTTPRequestFactory} the factory instance
   */
  withHeaders(headers: Record<string, HeaderValue>) {
    if (typeof headers === 'object') {
      for (const name of Object.keys(headers)) {
        this.requestDefaults.push((request: HTTPRequest) =>
          request.withHeader(name, headers[name])
        );
      }
    }
    return this;
  }

  withErrorInterceptors(...interceptors: ErrorInterceptor[]) {
    this.requestDefaults.push((request) => {
      request.withErrorInterceptors(...interceptors);
    });
    return this;
  }

  /**
   * Factory method for creating POST requests
   * @param {String} url
   */
  createPOSTRequest(url: string) {
    return this.createRequest(url, 'POST');
  }
  /**
   * Factory method for creating GET requests
   * @param {String} url
   */
  createGETRequest(url: string) {
    return this.createRequest(url, 'GET');
  }

  /**
   * Factory method for creating PUT requests
   * @param {String} url
   */
  createPUTRequest(url: string) {
    return this.createRequest(url, 'PUT');
  }
  /**
   * Factory method for creating DELETE requests
   * @param {String} url
   */
  createDELETERequest(url: string) {
    return this.createRequest(url, 'DELETE');
  }

  createPATCHRequest(url: string) {
    return this.createRequest(url, 'PATCH');
  }

  createHEADRequest(url: string) {
    return this.createRequest(url, 'HEAD');
  }

  createTRACERequest(url: string) {
    return this.createRequest(url, 'TRACE');
  }

  createRequest(url: string, method: HTTPMethod = 'GET') {
    return new HTTPRequest(url, method, this.requestDefaults);
  }

  /**
   * Creates a {@link HTTPRequest} with configuration based on the given {@link APIConfig}'s name and endpoint name.
   * It also populates the request's meta with info about the API and endpoint inside `request.meta.api`
   * merging in any meta defined in the api config's `api.meta` and `endpoint.meta`.
   * @param {string} apiName - The name of the API.
   * @param {string} endpointName - The name of the endpoint.
   * @return {HTTPRequest} The created request.
   *
   * @example
   * factory.createAPIRequest('my-api', 'my-endpoint')
   *    .withQueryParam('key', 'value')
   *    .withHeader('X-PoweredBy', 'Me')
   *    .execute();
   */
  createAPIRequest(apiName: string, endpointName: string): HTTPRequest {
    this.logger
      .withLevel(this.logLevel)
      .trace('Creating API request', apiName, endpointName);
    const api = this.apiConfigs[apiName];
    const endpoint: Endpoint = api?.endpoints[endpointName];
    if (!endpoint) {
      throw new Error(`Endpoint ${endpointName} not found in API ${apiName}`);
    }

    const url = getEndpointURL(endpoint, api);
    const meta = Object.assign(
      {
        api: {
          name: api.name,
          baseURL: api.baseURL,
        },
      },
      api.meta || {},
      endpoint.meta || {}
    );
    const request = this.createRequest(url, endpoint.method)
      .withMeta(meta)
      .withHeaders(api.headers || {})
      .withQueryParams(api.queryParams || {});
    if (api.responseBodyTransformer) {
      request.withResponseBodyTransformer(api.responseBodyTransformer);
    }
    if (api.errorInterceptors) {
      const errorInterceptors = Array.isArray(api.errorInterceptors)
        ? api.errorInterceptors
        : [api.errorInterceptors];
      request.withErrorInterceptors(...errorInterceptors);
    }
    return request;
  }
}
