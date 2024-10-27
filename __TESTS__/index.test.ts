import HTTPError from '../src/HTTPError.ts';
import { HTTPRequestFactory } from '../src/index.ts';
import { describe, expect, it } from 'vitest';


const factory = new HTTPRequestFactory().withLogLevel('debug');

factory
  .withAPIConfig(
    {
      name: 'simple-api',
      baseURL: 'https://httpbin.org',
      responseBodyTransformer: (body, request) => {
        if (request.meta?.api?.endpointName === 'get-products') {
          body.json.data = Object.keys(body.json.data).map((key) => ({
            id: key,
            ...body.data[key],
          }));
        }
        return body.json;
      },
      headers: {
        accepts: 'application/json',
      },
      endpoints: {
        bearer: {
          target: '/bearer',
        },
        'get-product-by-id': {
          method: 'POST',
          target: '/anything',
        },
        'get-products': {
          target: '/anything',
          method: 'POST',
        },
      },
    }
  )
  .withLogLevel('error')
  .when((request) => {
    return request.meta?.api?.endpointName === 'bearer';
  })
  .withHeaders({
    Authorization: () => `Bearer the-access-token`,
  });

describe('HTTP Tests', () => {
  try {
    it('test_post_request', async () => {
      const array = ['words', 'to', 'concatenate'];
      const response = await factory
        .createPOSTRequest('http://localhost:8080/api/concatenate')
        .withJSONBody(array)
        .execute();
      expect(response).toEqual(array.join(' '));
    });

    it('test_transformed_response_body', async () => {
      const response = await factory
        .createAPIRequest('simple-api', 'get-products')
        .withJSONBody({
          status: 'ok',
          data: {
            '123': {
              name: 'Product 123',
            },
            '456': {
              name: 'Product 456',
            },
          },
        })
        .execute();
      expect(Array.isArray(response.data)).toBeTruthy();
      expect(response.data).toHaveLength(2);
      expect(response.data[0].id).toBe('123');
      expect(response.data[1].id).toBe('456');
    });

    it('test_put_request', async () => {
      const array = ['words', 'to', 'concatenate'];
      const response = await factory
        .createPUTRequest('http://localhost:8080/api/concatenate')
        .withJSONBody(array)
        .execute();
      expect(response).toEqual(array.join(' '));
    });
    it('test_patch_request', async () => {
      const array = ['words', 'to', 'concatenate'];
      const response = await factory
        .createPATCHRequest('http://localhost:8080/api/concatenate')
        .withJSONBody(array)
        .execute();
      expect(response).toEqual(array.join(' '));
    });
    it('test_get_api_request_with_param', async () => {
      const result = await factory
        .createAPIRequest('simple-api', 'get-product-by-id')
        .withURLParam('productId', '123')
        .withJSONBody({
          status: 'ok',
          data: {
            id: '123',
            name: 'Product 123',
          },
        })
        .execute();

      expect(result.status).toEqual('ok');
      expect(result.data).toEqual({
        id: '123',
        name: 'Product 123',
      });
    });
    it('test_conditional_auth_headers_happy_path', async () => {
      await expect(
        factory.createAPIRequest('simple-api', 'bearer').execute()
      ).resolves.not.toThrowError();
    });
    it('test_conditional_auth_headers_failure', async () => {
      try {
        const result = await factory
          .createAPIRequest('simple-api', 'bearer')
          .blank() //get rid of auto-headers
          .withURLParam('productId', '123')
          .execute();
        
      } catch (e) {
        expect(e).toBeInstanceOf(HTTPError);
        expect(e).toHaveProperty('code', 401);
        expect(e.isUnauthorized()).toBeTruthy();
        expect(e.message).toEqual('UNAUTHORIZED');
      }
    });

    it('test_modified_response_from_interceptor', async () => {
      const result = await factory
        .createAPIRequest('simple-api', 'get-product-by-id')
        .withURLParam('productId', '123')
        .withResponseInterceptor(async (fetchResponse) => {
          const data = await fetchResponse.json();
          return {
            wrapped: data,
          };
        })
        .execute();
      expect(result).toHaveProperty('wrapped');
    });

    it('test_untouched_response_through_interceptor', async () => {
      const result = await factory
        .createAPIRequest('simple-api', 'get-product-by-id')
        .withURLParam('productId', '123')
        .withJSONBody({
          status: 'ok',
          data: {
            id: '123',
            secret: 'secret',
            name: 'Product 123',
          },
        })
        .withResponseInterceptor(async (fetchResponse) => {})
        .execute();
      expect(result).toHaveProperty('status', 'ok');
    });

    it('test_request_with_query_params', async () => {
      const url = 'https://jsonplaceholder.typicode.com/posts';
      const queryParams = {
        userId: 1,
        id: 1,
      };
      const request = factory.createGETRequest(url);
      request.withQueryParams(queryParams);
      const response = await request.execute();
      expect(response).toBeDefined();
      expect(response.length).toBeGreaterThan(0);
    });

    it('test_timeout', async () => {
      try {
        await factory
          .createGETRequest('http://localhost:8080/slow-response')
          .withTimeout(1000)
          .execute();
      } catch (e) {
        expect(e).toBeInstanceOf(HTTPError);
        expect(e.isAborted()).toBeTruthy();
      }
    });

    it('test_factory_error_interceptors', async () => {
      const factory = new HTTPRequestFactory();
      let handled: boolean[] = [];
      factory.withErrorInterceptors(async (error: HTTPError) => {
        return new Promise((resolve) => {
          const result = error.code === 401;
          handled.push(result);
          resolve(result);
        });
      });
      await expect(
        factory.createGETRequest('https://httpstat.us/401').execute()
      ).rejects.toThrowError(HTTPError);
      expect(handled).toEqual([true]);
    });

    it('test_api_error_interceptors', async () => {
      const responses: boolean[] = [];

      const factory = new HTTPRequestFactory().withAPIConfig({
        name: 'error-interceptors',
        errorInterceptors: (error: HTTPError) => {
          const result = error.code >= 500;
          responses.push(result);
          return result;
        },
        endpoints: {
          error: {
            target: 'https://httpstat.us/{{code}}',
          },
        },
      });
      await expect(
        factory
          .createAPIRequest('error-interceptors', 'error')
          .withURLParam('code', '500')
          .execute()
      ).rejects.toThrowError(HTTPError);
      await expect(
        factory
          .createAPIRequest('error-interceptors', 'error')
          .withURLParam('code', '501')
          .execute()
      ).rejects.toThrowError(HTTPError);
      await expect(
        factory
          .createAPIRequest('error-interceptors', 'error')
          .withURLParam('code', '400')
          .execute()
      ).rejects.toThrowError(HTTPError);
      expect(responses).toEqual([true, true, false]);
    });
  } catch (e) {
    console.log(e);
  }
});
