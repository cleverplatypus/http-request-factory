

class MockResponseComposer {
    private response: {
        body: any
        ok : boolean
        status: number
        url :string
        statusText:string
        redirected:boolean
        bodyUsed:boolean
        type:ResponseType
    };
    private rawResponse:any;
    private headers: {[key:string]:string} = {};

    constructor(rawResponse:any) {
        this.rawResponse =rawResponse;
    }

    withBody(body:any) {
        this.response.body = body;
        return this;
    }

    withOk(ok:boolean) {
        this.response.ok = ok;
        return this;
    }

    withUrl(url:string) {
        this.response.url = url;
        return this;
    }

    withStatusText(statusText:string) {
        this.response.statusText = statusText;
        return this;
    }

    withRedirected(redirected:boolean) {
        this.response.redirected = redirected;
        return this;
    }

    withBodyUsed(bodyUsed:boolean) {
        this.response.bodyUsed = bodyUsed;
        return this;
    }

    withType(type:ResponseType) {
        this.response.type = type;
        return this;
    }

    withStatus(status: number) {
        this.response.status = status;
        return this;
    }

    withHeaders(headers : {[key:string]:string}) {
       this.headers = headers;
        return this;
    }
        
    getResponse() :Response {
        const out:Response = Object.assign({}, this.response, {
            body: this.rawResponse,
            headers : new Headers(),
            json: () => Promise.resolve(this.rawResponse),
            blob: () => Promise.resolve(this.rawResponse as Blob),
            arrayBuffer: () => Promise.resolve(this.rawResponse),
            text: () => Promise.resolve(this.rawResponse),
            formData: () => Promise.resolve(this.rawResponse),
            clone : () => {throw new Error('Cannot clone a mock response')},
        });
        for(const key in this.headers) {
            out.headers.set(key, this.headers[key]);
        }
        return out
    }
    
}

export function createMockResponseComposer(rawResponse: any): MockResponseComposer {
    return new MockResponseComposer(rawResponse);
}