# HTTP Request Factory

![GitHub release](https://img.shields.io/github/v/release/cleverplatypus/http-request-factory?filter=*&label=Version)
&nbsp;&nbsp;![](https://github.com/cleverplatypus/http-request-factory/actions/workflows/test.yml/badge.svg)

> Check the [API Docs here](https://cleverplatypus.github.io/http-request-factory/)

A wrapper for the [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) to simplify handling of HTTP requests.

Works in the web browser and on Node.js from v17.5 with the `--experimental-fetch` flag set.

It provides a method-chain interface to setup request and  configuration-driven API handling.

### Browser compatibility

The library uses
- [FetchAPI](https://caniuse.com/fetch)
- [Proxy Object](https://caniuse.com/proxy)
- [TypeScript](https://www.typescriptlang.org)


## Installation
```sh
yarn add http-request-factory

# or

npm i http-request-factory
```

## Basic Usage
```ts
import { HTTPRequestFactory } from 'http-request-factory';

//...

const factory = new HTTPRequestFactory()
    .withLogLevel(myenv.LOG_LEVEL);

const data = await factory
    .createGETRequest('https://mydomain.com/some-endpoint')   
    .withQueryParam('color', 'blue')
    .withAccept('application/json')
    .withHeader('x-my-app-key', myenv.APP_KEY)
    .execute();
//data will be the actual response body
```

## Using an API

It's possible to define a group of endpoints that live at the same base URL by creating an API configuration:

```ts
//api-config.ts
import {APIConfig} from 'http-request-factory';

const apis : APIConfig[] = [{
        name : 'aws',
        baseURL : 'https://aws.mydomain.com/a09dsjas0j9df0asj0fads9jdsj9',
        endpoints : {
            'get-products' : {
                target : '/get-products',
                method : 'GET' //optional defaults to GET
            }
        }
    }, {
        name : 'my-api'
        baseURL : 'https://mydomain.com/api/v2',
        meta : {
            poweredBy : 'me'
        },
        endpoints : {
            'get-product-info' : {
                target : '/product/{{productId}}',
            }
        }

    }];

export default apis;
```

The APIs can then be attached to the request factory using `factory.withAPIConfig()` and requests can be created using `factory.createAPIRequest(apiName, endpointName)`

It's possible to conditionally configure requests based using `factory.when((request:HTTPRequest) => boolean).<any-configuration-method>()`

API information is appended to its endpoints' meta dictionary.

When a passed value in configuration methods is a function, its value will be resolved just before executing the fetch request.


```ts
//request-factory.ts
import { HTTPRequestFactory } from 'http-request-factory';
import apis from './api-config.ts'
//...

const factory = new HTTPRequestFactory()
    .withLogLevel(myenv.LOG_LEVEL)
    .withAPIConfig(...apis)
    .when((request) => { //set a condition for the next settings
        request.meta.api?.name === 'aws'
    })
    .withHeaders({
        'x-aws-api-key' : myenv.AWS_API_KEY,
        'authorization' : () => `Bearer ${sessionModel.awsAccessToken}`
    })
    .withLogLevel('trace')
    .always() //resets the condition
    .withHeader('x-powered-by', (request) => request.meta.poweredBy);

export default factory;
```

Endpoint target paths can contain params in the form of `{{paramName}}` that can be substituted using `request.withURLParam(paramName, value)`. Useful, for instance, to wrap REST APIs.

```ts
//some-controller.ts
import requestFactory from './request-factory.ts';

const awsData = await requestFactory
    .createAPIRequest('aws', 'get-products')
    .execute();

const myAPIData = await requestFactory
    .createAPIRequest('my-api', 'get-product-info')
    .withURLParam('productID', 123)
    .execute();
```

## Testing
The test suite is written in Jest and requires [Deno](https://deno.land)

![](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)&nbsp;&nbsp;![](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)&nbsp;&nbsp;![](https://img.shields.io/badge/Jest-323330?style=for-the-badge&logo=Jest&logoColor=white)&nbsp;&nbsp;![](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
