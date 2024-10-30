import ILogger from "./ILogger.ts";
import { ErrorInterceptor, HeaderValue, HTTPMethod, LogLevel, QueryParameterValue, RequestConfig, RequestInterceptor, ResponseBodyTransformer, ResponseInterceptor } from "./types.ts";
import { HTTPRequestFactory } from "./HTTPRequestFactory.ts";
type RequestConstructorArgs = {
    url: string;
    method: HTTPMethod;
    defaultConfigBuilders: Function[];
    factory: HTTPRequestFactory;
};
/**
 * HTTP Request. This class shouldn't be instanciated directly.
 * Use {@link HTTPRequestFactory} createXXXRequest() instead
 */
export declare class HTTPRequest {
    private configBuilders;
    private wasUsed;
    private logger;
    private config;
    private timeoutID?;
    private fetchBody;
    private factory;
    /**
     * Returns the fetch response content in its appropriate format
     * @param {Response} response
     */
    private readResponse;
    constructor({ url, method, defaultConfigBuilders, factory, }: RequestConstructorArgs);
    /**
     * Gets the URL of the request.
     *
     * @returns {string} the URL of the request
     */
    get url(): string;
    private getLogger;
    private setupHeaders;
    private setupTimeout;
    private setupQueryParams;
    private setupBody;
    private setupURL;
    /**
     * Executes the fetch request and returns a Promise that resolves with the parsed result.
     *
     * @return {Promise<any>} A Promise that resolves with the result of the request.
     */
    execute(): Promise<any>;
    /**
     * Retrieves a read-only copy of configuration.
     *
     * @return {type} The frozen configuration object.
     */
    getConfig(): RequestConfig;
    /**
     * Configures the request with metadata that can be inspected later.
     *
     * @param {string | Record<string, any>} param1 - The key or object containing the key-value pairs to update the meta property.
     * @param {any} [param2] - The value to associate with the key when param1 is a string.
     * @return {this} - Returns the current object instance for method chaining.
     */
    withMeta(param1: string | Record<string, any>, param2?: any): this;
    /**
     * Sets an ILogger compatible logger for the request. Normally the logger will be set by the factory.
     *
     * @param {ILogger} logger - The logger to be set.
     * @return {HTTPRequest} - The updated HTTP request instance.
     */
    withLogger(logger: ILogger): this;
    /**
     * Sets the credentials policy for the HTTP request.
     *
     * @param {RequestCredentials} config - The configuration for the credentials.
     * @return {HTTPRequest} - The updated HTTP request instance.
     */
    withCredentialsPolicy(config: RequestCredentials): HTTPRequest;
    /**
     * Sets the `uriEncodedBody` property of the config object to `true`.
     * This function is used to indicate that the body of the request should be URL encoded.
     *
     * @return {HTTPRequest} - The updated instance of the class.
     */
    withUriEncodedBody(): this;
    /**
     * Clears the config builders array and returns the instance.
     * Useful in cases where you want to create a new request that doesn't inherit
     * from API/factory settings that might have headers or other unwanted configuration
     *
     * @return {HTTPRequest} the updated request
     */
    blank(): this;
    /**
     * Sets the accepted MIME types for the request.
     *
     * @param {...string} mimeTypes - An array of MIME types to accept.
     * @return {HTTPRequest} - The updated request instance.
     */
    withAccept(...mimeTypes: any[]): this;
    /**
     * Adds a URL parameter to the request configuration.
     *
     * @param {string} name - The name of the URL parameter.
     * @param {string} value - The value of the URL parameter.
     * @return {HTTPRequest} - The updated request instance.
     */
    withURLParam(name: string, value: string): this;
    /**
     * Assigns multiple query params to the request configuration.
     *
     * @param {Record<string, QueryParameterValue>} params - The URL parameters to assign.
     * @return {HTTPRequest} - The updated request instance.
     */
    withURLParams(params: Record<string, QueryParameterValue>): this;
    withFormEncodedBody(data: string): this;
    withErrorInterceptors(...interceptors: ErrorInterceptor[]): void;
    /**
     * Adds a request interceptor to the request configuration.
     * Interceptors are executed in the order they are added.
     * - If a request interceptor returns a rejected promise, the request will fail.
     * - If a request interceptor returns a resolved promise, the promise's result will be used as the response.
     * - If the interceptor returns `undefined`, the request will continue to the next interceptor, if present, or to the regular request handling
     * - the interceptor's second parameter is is a function that can be used to remove the interceptor from further request handling
     *
     * @param {RequestInterceptor} interceptor - The interceptor to add.
     * @return {HTTPRequest} - The updated request instance.
     */
    withRequestInterceptors(...interceptors: RequestInterceptor[]): void;
    /**
     * Set the request body as a JSON object or string.
     *
     * @param {any} json - The JSON object or string to set as the request body.
     * @return {HTTPRequest} - The updated request instance.
     */
    withJSONBody(json: any): this;
    /**
     * Set the request body to a FormData object and allows customizing the form data before sending the request.
     *
     * @param {Function} composerCallBack - the callback function that customizes the FormData object
     * @return {HTTPRequest}
     */
    withFormDataBody(composerCallBack?: (formData: FormData) => void): HTTPRequest;
    /**
     * Short-hand for setting the accepted MIME types to ['*\/*'] which means the API accepts any MIME type.
     *
     * @return {Object} - The current object instance.
     */
    withAcceptAny(): this;
    /**
     * When called, the request will not try to parse the response
     *
     * @return {HTTPRequest} - The updated request instance.
     */
    ignoreResponseBody(): this;
    /**
     * Adds multiple query parameters to the existing query parameters
     * of the API configuration.
     *
     * @param {Record<string, QueryParameterValue>} params - The query parameters
     * to be added.
     * @return {HTTPRequest} - The updated request instance.
     */
    withQueryParams(params: Record<string, QueryParameterValue>): this;
    /**
     * Sets the CORS mode to 'no-cors' and returns the current object.
     *
     * @return {Object} - The current object.
     */
    withNoCors(): this;
    /**
     * Adds a query parameter to the request.
     *
     * @param {string} name - The name of the query parameter.
     * @param {QueryParameterValue} value - The value of the query parameter.
     * @return {HTTPRequest} - The updated request instance.
     */
    withQueryParam(name: string, value: QueryParameterValue): this;
    /**
     *
     * @param {String} level the log level to apply for this request. One of LOG_LEVEL_ERROR, LOG_LEVEL_WARN, LOG_LEVEL_INFO, LOG_LEVEL_DEBUG defined in constants.js
     * Overrides the default log level.
     * @return {HTTPRequest} - The updated request instance.
     */
    withLogLevel(level: LogLevel): this;
    /**
     * Sets the request's Accept header to 'application/json'
     */
    acceptJSON(): this;
    /**
     * @param {Object} headers name-value pairs to set as headers
     * If value is undefined, the corresponding header will be removed if present
     * @return {HTTPRequest} - The updated request instance.
     */
    withHeaders(headers: Record<string, HeaderValue>): this;
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
    withResponseBodyTransformers(...transformers: ResponseBodyTransformer[]): this;
    /**
     *
     * @param {String} name header name
     * @param {*} value the value for the header, omit this parameter to remove the header
     * @return {HTTPRequest} - The updated request instance.
     */
    withHeader(name: string, value: HeaderValue): this;
    /**
     *
     * @param {Number} timeout milliseconds to wait before failing the request as timed out
     * @return {HTTPRequest} - The updated request instance.
     */
    withTimeout(timeout: number): this;
    /**
     *
     * @param {Function} handler a callback function to process the raw response coming from the Fetch API.
     * This can be defined if, to override the default behaviour for HTTP status handling.
     * The callback signature is `function(response:Object, requestObj:HttpRequest)`
     * @return {HTTPRequest} - The updated request instance.
     */
    withResponseInterceptors(...interceptors: ResponseInterceptor[]): HTTPRequest;
    /**
     * Get the meta data that was set on the request.
     *
     * @return {Object} The meta data of the object.
     */
    get meta(): Record<string, any>;
}
export {};
