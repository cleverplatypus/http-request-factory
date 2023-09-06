import { Application, Router, Context } from 'https://deno.land/x/oak/mod.ts';

const app = new Application();
const router = new Router();

router.get('/shutdown', async (ctx: Context) => {
  setTimeout(() => {
    Deno.exit();
  });
  ctx.response.body = 'shutting down...';
});

router.get('/slow-response', async (ctx: Context) => {
  await new Promise((resolve) => {
    setTimeout(() => {
      resolve(`it's late`);
    }, 2000);
  });
});

router.all('/api/concatenate', async (ctx: Context) => {
  const result = ctx.request.body();
  const array = await result.value;
  ctx.response.body = array.join(' ');
});

router.get('/api/product/:productId', async (ctx: Context) => {
  ctx.response.body = {
    status: 'ok',
    data: {
      id: ctx.params.productId,
      name: `Product ${ctx.params.productId}`,
    },
  };
});

router.get('/api/products', async (ctx: Context) => {
  ctx.response.body = {
    status: 'ok',
    data: {
      '123': {
        name: 'Product 123',
      },
      '456': {
        name : 'Product 456',
      }
    },
  };
});

router.get('/admin/product/:productId', async (ctx: Context) => {
  console.log(ctx.request.headers.get('Authorization')),
    console.log(ctx.request.headers.get('x-api-key'));
  if (
    ctx.request.headers.get('Authorization') !== 'Bearer the-access-token' ||
    ctx.request.headers.get('x-api-key') !== 'the-api-key'
  ) {
    ctx.response.status = 401;
    ctx.response.body = 'Missing required header Authorization';
    return;
  }
  console.log('request is ok');
  ctx.response.body = {
    status: 'ok',
    data: {
      id: ctx.params.productId,
      name: `Product ${ctx.params.productId}`,
      secret: 'secret',
    },
  };
});

app.use(router.routes());
app.use(router.allowedMethods());

await app.listen({ port: 8080 });
