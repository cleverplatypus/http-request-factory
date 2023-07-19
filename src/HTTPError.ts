export default class HTTPError {
    
    readonly code: number;
    readonly message: string;
    readonly body?: any;
    constructor(
        code: number,
        message : string,
        body?: any
    ) {
        this.code = code;
        this.message = message;
        this.body = body;
    }

    isUnauthorized(): boolean {
        return this.code === 401;
    }

    isNotFound(): boolean {
        return this.code === 404;
    }

    isForbidden(): boolean {
        return this.code === 403;
    }

    isMethodNotAllowed(): boolean {
        return this.code === 405;
    }

    isConflict(): boolean {
        return this.code === 409;
    }

    isTooManyRequests(): boolean {
        return this.code === 429;
    }

    isInternalServerError(): boolean {
        return this.code === 500;
    }

    isNotImplemented(): boolean {
        return this.code === 501;
    }
}