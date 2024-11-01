export default class HTTPError extends Error {
    readonly code: number;
    readonly message: string;
    readonly body?: any;
    constructor(code: number, message: string, body?: any);
    isUnauthorized(): boolean;
    isNotFound(): boolean;
    isForbidden(): boolean;
    isMethodNotAllowed(): boolean;
    isConflict(): boolean;
    isTooManyRequests(): boolean;
    isInternalServerError(): boolean;
    isNotImplemented(): boolean;
    isTimedOut(): boolean;
    isAborted(): boolean;
}
