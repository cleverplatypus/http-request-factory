import { HTTPRequest } from './HTTPRequest.ts';
import ILogger from './ILogger.ts';
import { APIConfig, HeaderValue, HTTPMethod, LogLevel } from './types.ts';
/**
 * A factory for creating {@link HTTPRequest} instances.
 * It can be configured with defaults, logging options as well as
 * conditional settings using {@link when} in a method-chain fashion.
 */
export declare class HTTPRequestFactory {
    private requestDefaults;
    private apiConfigs;
    private logger;
    private logLevel;
    /**
     * Resets any conditions in the method chain set by {@link when}
     * @returns {HTTPRequestFactory} the factory instance
     */
    always(): this;
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
    when(condition: (request: HTTPRequest) => boolean): this;
    /**
     * Sets the logger adapter for the instance for every request created.
     * By default the logger will be set by the factory to the internal `ConsoleLogger` adapter.
     *
     * @param {ILogger} logger - The logger to set.
     * @returns {HTTPRequestFactory} the factory instance
     */
    withLogger(logger: ILogger): this;
    /**
     * Adds {@link APIConfig} configurations that can be consumed by calling {@link createAPIRequest}.
     *
     * @param {...APIConfig } apis - A list of {@link APIConfig} configurations.
     * @returns {HTTPRequestFactory} the factory instance
     */
    withAPIConfig(...apis: Array<APIConfig>): this;
    /**
     * Adds the specified MIME types to the accept header to the factory defaults.
     *
     * @param {...string} mimeTypes - An array of MIME types to be added to the accept header.
     * @returns {HTTPRequestFactory} the factory instance
     */
    withAccept(...mimeTypes: Array<string>): this;
    /**
     * Adds the specified header to the factory defaults.
     *
     * @param {string} key - The key of the header.
     * @param {string | ((request: HTTPRequest) => string)} value - The value of the header.
     * @returns {HTTPRequestFactory} the factory instance
     */
    withHeader(key: string, value: string | ((request: HTTPRequest) => string)): this;
    /**
     * Sets the credentials policy for the factory defaults.
     *
     * @param {RequestCredentials} config - The credentials policy to be set.
     * @returns {HTTPRequestFactory} the factory instance
     */
    withCredentialsPolicy(config: RequestCredentials): this;
    /**
     * Sets the log level to the factory defaults.
     *
     * @param {LogLevel} level - The log level to be set.
     * @returns {HTTPRequestFactory} the factory instance
     */
    withLogLevel(level: LogLevel): this;
    /**
     * Adds a response body transformer to the factory defaults.
     *
     * @param {ResponseBodyTransformer} transformer - The function that will be used to transform the response body.
     * @returns {HTTPRequestFactory} the factory instance
     */
    withResponseBodyTransformer(transformer: (body: any, request: HTTPRequest) => any): this;
    /**
     * Adds the provided headers to the factory defaults.
     *
     * @param {Record<string, HeaderValue>} headers - The headers to be added to the request.
     * @returns {HTTPRequestFactory} the factory instance
     */
    withHeaders(headers: Record<string, HeaderValue>): this;
    /**
     * Factory method for creating POST requests
     * @param {String} url
     */
    createPOSTRequest(url: string): HTTPRequest;
    /**
     * Factory method for creating GET requests
     * @param {String} url
     */
    createGETRequest(url: string): HTTPRequest;
    /**
     * Factory method for creating PUT requests
     * @param {String} url
     */
    createPUTRequest(url: string): HTTPRequest;
    /**
     * Factory method for creating DELETE requests
     * @param {String} url
     */
    createDELETERequest(url: string): HTTPRequest;
    createPATCHRequest(url: string): HTTPRequest;
    createHEADRequest(url: string): HTTPRequest;
    createTRACERequest(url: string): HTTPRequest;
    createRequest(url: string, method?: HTTPMethod): HTTPRequest;
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
    createAPIRequest(apiName: string, endpointName: string): HTTPRequest;
}
//# sourceMappingURL=HTTPRequestFactory.d.ts.map