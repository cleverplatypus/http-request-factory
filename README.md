# HTTP Request Factory

![Tests](https://github.com/cleverplatypus/http-request-factory/actions/workflows/test.yml/badge.svg)

A wrapper for the [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) to simplify handling of HTTP requests.

It provides a method-chain interface to setup request and  configuration-driven API handling.

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

It's possible to define a group of endpoints that live at the same base URL by creating an api configuration:

```ts
//api-config.ts
export default [{
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
```

The APIs can then be attached to the request factory using `factory.withAPIConfig()` and requests can be created using `factory.createAPIRequest(apiName, endpointName)`

It's possible to conditionally configure requests based using `factory.when((request:HTTPRequest) => boolean).<any-configuration-method>()`

API information is appended to its endpoints' meta dictionary.

When a passed value in configuration methods is a function, its value will be resolved just before executing the fetch request.


```ts
//http-factory.ts
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
import httpFactory from './http-factory.ts';

const awsData = await factory
    .createAPIRequest('aws', 'get-products')
    .execute();

const myAPIData = await factory
    .createAPIRequest('my-api', 'get-product-info')
    .withURLParam('productID', 123)
    .execute();
```

