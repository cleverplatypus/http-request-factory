import { type } from 'os';
import { HTTPRequest } from './HTTPRequest.ts';

export type LogLevel = 'none' | 'trace' | 'debug' | 'info' | 'warn' | 'error';

export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'TRACE';

export type ScalarType = string | number | boolean;

export type ExpectedResponseFormat = 
    'auto'
    | 'json'
    | 'text'
    | 'blob'
    | 'arrayBuffer';
    
export type QueryParameterValue =
   ScalarType | Array<ScalarType>;

export type DynamicHeaderValue = ((request:HTTPRequest)=>string|undefined);

export type HeaderValue = string|DynamicHeaderValue;

export type ResponseHandler = 
    (response:Response, requestObj:HTTPRequest) => Promise<any>

export type ResponseInterceptor = 
    (response:Response, requestObj:HTTPRequest) => Promise<any>

export type RequestConfig = {
    url: string
    headers: Record<string, HeaderValue>
    body: any
    timeout: number
    method: HTTPMethod
    logLevel: LogLevel
    meta: Record<string, any>
    queryParams: Object
    credentials : RequestCredentials
    uriEncodedBody : boolean
    expectedResponseFormat: ExpectedResponseFormat
    acceptedMIMETypes: string[]
    corsMode: RequestMode
    urlParams : Record<string, ScalarType | ((HTTPRequest) => ScalarType)>
    responseInterceptor?: ResponseInterceptor
    
}

export type Endpoint = {
    target : string
    method? : HTTPMethod
    meta? : Record<string, any>
}

export type NamedEndpoint = {
    name: string
} & Endpoint;

export type APIConfig = {
    baseURL? : string | ((endpoint: Endpoint) => string)
    name : string
    meta? : Record<string, any>,
    headers? : Record<string, HeaderValue>,
    endpoints : {
        [endpointName: string]: Endpoint
    }
}