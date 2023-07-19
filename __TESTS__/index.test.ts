import HTTPError from '../src/HTTPError.ts';
import { HTTPRequestFactory } from '../src/index.ts';

const sessionModel = {
  accessToken: 'the-access-token',
};

const factory = new HTTPRequestFactory();

factory
  .withAPIConfig(
    {
      name: 'simple-api',
      baseURL: 'http://localhost:8080/api',
      endpoints: {
        'get-product-by-id': {
          target: '/product/{{productId}}',
          method: 'GET',
        },
      },
    },
    {
      name: 'admin-api',
      baseURL: 'http://localhost:8080/admin',
      meta: {
        api_key: 'the-api-key',
      },
      endpoints: {
        'get-product-full-data-by-id': {
          target: '/product/{{productId}}',
          method: 'GET',
        },
      },
    }
  )
  .withLogLevel('error')
  .when((request) => {
    return request.meta?.api?.name === 'admin-api';
  })
  .withHeaders({
    'X-API-KEY': (request) => request.meta!.api_key,
    Authorization: () => `Bearer ${sessionModel.accessToken}`,
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
        .execute();

      expect(result.status).toEqual('ok');
      expect(result.data).toEqual({
        id: '123',
        name: 'Product 123',
      });
    });
    it('test_conditional_auth_headers_happy_path', async () => {
        expect(async () => {
            const result = await factory
            .createAPIRequest('admin-api', 'get-product-full-data-by-id')
            .withURLParam('productId', '123')
            .execute();
            expect(result?.status).toEqual('ok');
            expect(result?.data).toEqual({
                id: '123',
                secret: 'secret',
                name: 'Product 123',
            });
            return result;
        }).not.toThrowError();
    });
    it('test_conditional_auth_headers_failure', async () => {
        try {
            const result = await factory
            .createAPIRequest('admin-api', 'get-product-full-data-by-id')
            .blank()
            .withURLParam('productId', '123')
            .execute();
            expect(result?.status).toEqual('ok');
            expect(result?.data).toEqual({
                id: '123',
                secret: 'secret',
                name: 'Product 123',
            });
        } catch (e) {
            expect(e).toBeInstanceOf(HTTPError);
            expect(e).toHaveProperty('code', 401);
            expect(e.isUnauthorized()).toBeTruthy();
            expect(e.body).toEqual('Missing required header Authorization');
        }
    });
  } catch (e) {
    console.log(e);
  }
});
