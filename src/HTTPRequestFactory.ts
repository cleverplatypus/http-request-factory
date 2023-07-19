import ConsoleLogger from './ConsoleLogger.ts';
import { HTTPRequest } from './HTTPRequest.ts';
import ILogger from './ILogger.ts';
import {
  APIConfig,
  DynamicHeader,
  Endpoint,
  HTTPMethod,
  LogLevel,
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

export class HTTPRequestFactory {
  private requestDefaults: Function[] = [];
  private apiConfigs: { [key: string]: APIConfig } = {};
  private logger: ILogger = new ConsoleLogger();
  private logLevel: LogLevel = 'error';

  /* CONDITIONAL REQUEST CONFIGURATION */
  always() {
    return this;
  }

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

  /* =============================================== */

  withLogger(logger: ILogger) {
    this.logger = logger;
    this.requestDefaults.push((request: HTTPRequest) =>
      request.withLogger(logger)
    );
    return this;
  }

  withAPIConfig(...apis: Array<APIConfig>) {
    apis.forEach((api) => {
      this.apiConfigs[api.name] = api;
    });
    return this;
  }

  withAccept(...mimeTypes: Array<string>) {
    this.requestDefaults.push((request: HTTPRequest) =>
      request.withAccept(mimeTypes)
    );
    return this;
  }
  withHeader(key: string, value: string | ((request: HTTPRequest) => string)) {
    this.requestDefaults.push((request: HTTPRequest) =>
      request.withHeader(key, value)
    );
    return this;
  }

  withCredentialsPolicy(config: RequestCredentials) {
    this.requestDefaults.push((request: HTTPRequest) =>
      request.withCredentialsPolicy(config)
    );
    return this;
  }

  withLogLevel(level: LogLevel) {
    this.logLevel = level;
    this.requestDefaults.push((request: HTTPRequest) =>
      request.withLogLevel(level)
    );
    return this;
  }

  withMockResponder(mockResponder: Function) {
    this.requestDefaults.push((request) =>
      request.withMockResponder(mockResponder)
    );

    return this;
  }

  /**
   * @param {Object} headers name-value pairs to set as default headers for all requests
   * If value is undefined, the corresponding header will be removed if present
   */
  withHeaders(headers: { [key: string]: DynamicHeader }) {
    if (typeof headers === 'object') {
      for (const name of Object.keys(headers)) {
        this.requestDefaults.push((request: HTTPRequest) =>
          request.withHeader(name, headers[name])
        );
      }
    }
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

  createRequest(url: string, method: HTTPMethod) {
    return new HTTPRequest(url, method, this.requestDefaults);
  }

  createAPIRequest(apiName: string, endpointName: string): HTTPRequest {
    this.logger
      .withLevel(this.logLevel)
      .trace('Creating API request', apiName, endpointName);
    const api = this.apiConfigs[apiName];
    const endpoint: Endpoint = api.endpoints[endpointName];

    const url = getEndpointURL(endpoint, api);
    const meta = Object.assign({
      api: {
        name: api.name,
        baseURL: api.baseURL,
      }},
      (api.meta || {}),
      (endpoint.meta || {}),
    );
    return this[`create${(endpoint.method || 'GET').toUpperCase()}Request`](
      url
    ).withMeta(meta);
  }
}
