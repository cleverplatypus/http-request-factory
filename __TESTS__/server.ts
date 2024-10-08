import { Application, Router, Context } from 'https://deno.land/x/oak@14.2.0/mod.ts';

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
  const result = await ctx.request.body.json();
  ctx.response.body = result.join(' ');
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
  if (
    ctx.request.headers.get('Authorization') !== 'Bearer the-access-token' ||
    ctx.request.headers.get('x-api-key') !== 'the-api-key'
  ) {
    ctx.response.status = 401;
    ctx.response.body = 'Missing required header Authorization';
    return;
  }
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
