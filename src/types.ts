import { type } from 'os';
import { HTTPRequest } from './HTTPRequest.ts';
import HTTPError from './HTTPError.ts';

export type LogLevel = 'none' | 'trace' | 'debug' | 'info' | 'warn' | 'error';

export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'TRACE';


export type ScalarType = string | number | boolean;

/**
 * @internal
 */
export type ExpectedResponseFormat = 
    'auto'
    | 'json'
    | 'text'
    | 'blob'
    | 'arrayBuffer';
    
export type QueryParameterValue =
   ScalarType | Array<ScalarType>;

export type DynamicHeaderValue = ((request:HTTPRequest)=>string|undefined);

export type ResponseBodyTransformer = (body: any, request: HTTPRequest) => any;

export type HeaderValue = string|DynamicHeaderValue;

export type ResponseHandler = 
    (response:Response, requestObj:HTTPRequest) => Promise<any>

export type ResponseInterceptor = 
    (response:Response, requestObj:HTTPRequest) => Promise<any>

export type ErrorInterceptor =
    (HTTPError) => boolean | Promise<boolean>

/**
 * Internal representation of a {@link HTTPRequest}'s configuration
 */
export type RequestConfig = {
    url: string
    headers: Record<string, HeaderValue>
    body: any
    timeout: number
    method: HTTPMethod
    logLevel: LogLevel
    meta: Record<string, any>
    queryParams: Object
    responseBodyTransformer?: ResponseBodyTransformer
    ignoreResponseBody: boolean
    credentials : RequestCredentials
    uriEncodedBody : boolean
    expectedResponseFormat: ExpectedResponseFormat
    acceptedMIMETypes: string[]
    corsMode: RequestMode
    urlParams : Record<string, ScalarType | ((HTTPRequest) => ScalarType)>
    responseInterceptor?: ResponseInterceptor
    errorInterceptors?: ErrorInterceptor[]
}

/**
 * The definition of an API endpoint to be listed in the {@link APIConfig.endpoints} map
 */
export type Endpoint = {
    /**
     * The path of the endpoint relative to the API {@link APIConfig.baseURL}
     */
    target : string
    /**
     * The HTTP method of the endpoint. Defaults to `GET`
     */
    method? : HTTPMethod
    /**
     * Any metadata that should be attached to the endpoint's requests for later reference
     */
    meta? : Record<string, any>
}

/**
 * @internal
 */
export type NamedEndpoint = {
    name: string
} & Endpoint;


/**
 * Configuration for an API to be added with {@link HTTPRequestFactory.withAPIConfig}
 */
export type APIConfig = {
    /**
     * The base to be used as base URL for this API. If omitted, the value provided in each endpoint's `target` will be used.
     */
    baseURL? : string | ((endpoint: Endpoint) => string)
    /**
     * The name of the API to be referenced in {@link HTTPRequestFactory.createAPIRequest}
     */
    name : string
    /**
     * Any metadata that should be attached to the API for later reference
     */
    meta? : Record<string, any>,
    /**
     * Any headers that should be applied to each request. 
     * Notice that if a header value is  {@link DynamicHeaderValue}, 
     * the function will be called with the current request as argument, 
     * so conditional logic can be applied to generate the value.
     */
    headers? : Record<string, HeaderValue>,
    /**
     * An optional {@link ResponseBodyTransformer} function to be applied to all of
     * the API's responses.
     */
    responseBodyTransformer? : ResponseBodyTransformer,

    errorInterceptors? : ErrorInterceptor | Array<ErrorInterceptor>
    
    queryParams? : Record<string, QueryParameterValue>

    /**
     * A map of {@link Endpoint} for the API
     */
    endpoints : {
        [endpointName: string]: Endpoint
    }
}