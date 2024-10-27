import { HTTPRequest } from './HTTPRequest.ts';
import HTTPError from './HTTPError.ts';

export type LogLevel = 'none' | 'trace' | 'debug' | 'info' | 'warn' | 'error';

export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'TRACE';

export type ScalarType = string | number | boolean;

export type InterceptorCommands = {
    deleteInterceptor: () => void
    replaceURL: (url:string) => void
}

export type RequestInterceptor = (request:HTTPRequest, commands:InterceptorCommands) => Promise<any | undefined>;

export type RequestDefaults = (request : HTTPRequest) => void;
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
    (response:Response, requestObj:HTTPRequest) => Promise<any>;

export type ResponseInterceptor = 
    (response:Response, requestObj:HTTPRequest) => Promise<any>;
export type ErrorInterceptor =
    (error:HTTPError) => boolean | Promise<boolean>
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
    responseBodyTransformers: ResponseBodyTransformer[]
    ignoreResponseBody: boolean
    credentials : RequestCredentials
    uriEncodedBody : boolean
    expectedResponseFormat: ExpectedResponseFormat
    acceptedMIMETypes: string[]
    corsMode: RequestMode
    urlParams : Record<string, ScalarType | ((HTTPRequest) => ScalarType)>
    requestInterceptors: RequestInterceptor[]
    responseInterceptors: ResponseInterceptor[]
    errorInterceptors: ErrorInterceptor[]
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
     * If the name is 'default' it will be used as the default API when calling {@link HTTPRequestFactory.createAPIRequest}
     * with one argument (the name of the endpoint).
     */
    name : string | 'default'
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
    responseBodyTransformers? : ResponseBodyTransformer | ResponseBodyTransformer[],
    requestInterceptors? : RequestInterceptor | Array<RequestInterceptor>,
    errorInterceptors? : ErrorInterceptor | Array<ErrorInterceptor>,
    queryParams? : Record<string, QueryParameterValue>,

    /**
     * A map of {@link Endpoint} for the API
     */
    endpoints : {
        [endpointName: string]: Endpoint
    }
}