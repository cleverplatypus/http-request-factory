import { HTTPRequestFactory } from './src/index.ts';

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

  const request = await factory
  .createAPIRequest('admin-api', 'get-product-full-data-by-id')
  .withURLParam('productId', '123');
  let result = await request.execute();
  
