import HTTPError from "../src/HTTPError.ts";
import { HTTPRequest } from "../src/HTTPRequest.ts";
import { HTTPRequestFactory } from "../src/index.ts";
import { describe, expect, it } from "vitest";

const sessionModel = {
  accessToken: "the-access-token",
};

const factory = new HTTPRequestFactory().withLogLevel("debug");

factory
  .withAPIConfig(
    {
      name: "simple-api",
      baseURL: "http://localhost:8080/api",
      responseBodyTransformer: (body, request) => {
        const url = new URL(request.getConfig().url);
        console.warn(url.pathname);
        if (url.pathname === "/api/products") {
          body.data = Object.keys(body.data).map((key) => ({
            id: key,
            ...body.data[key],
          }));
        }
        return body;
      },
      endpoints: {
        "get-product-by-id": {
          target: "/product/{{productId}}",
          method: "GET",
        },
        "get-products": {
          target: "/products",
          method: "GET",
        },
      },
    },
    {
      name: "admin-api",
      baseURL: "http://localhost:8080/admin",
      meta: {
        api_key: "the-api-key",
      },
      endpoints: {
        "get-product-full-data-by-id": {
          target: "/product/{{productId}}",
          method: "GET",
        },
      },
    }
  )
  .withLogLevel("error")
  .when((request) => {
    return request.meta?.api?.name === "admin-api";
  })
  .withHeaders({
    "X-API-KEY": (request) => request.meta!.api_key,
    Authorization: () => `Bearer ${sessionModel.accessToken}`,
  });

describe("HTTP Tests", () => {
  try {
    it("test_post_request", async () => {
      const array = ["words", "to", "concatenate"];
      const response = await factory
        .createPOSTRequest("http://localhost:8080/api/concatenate")
        .withJSONBody(array)
        .execute();
      expect(response).toEqual(array.join(" "));
    });

    it("test_transformed_response_body", async () => {
      const response = await factory
        .createAPIRequest("simple-api", "get-products")
        .execute();
      expect(Array.isArray(response.data)).toBeTruthy();
      expect(response.data).toHaveLength(2);
      expect(response.data[0].id).toBe("123");
      expect(response.data[1].id).toBe("456");
    });

    it("test_put_request", async () => {
      const array = ["words", "to", "concatenate"];
      const response = await factory
        .createPUTRequest("http://localhost:8080/api/concatenate")
        .withJSONBody(array)
        .execute();
      expect(response).toEqual(array.join(" "));
    });
    it("test_patch_request", async () => {
      const array = ["words", "to", "concatenate"];
      const response = await factory
        .createPATCHRequest("http://localhost:8080/api/concatenate")
        .withJSONBody(array)
        .execute();
      expect(response).toEqual(array.join(" "));
    });
    it("test_get_api_request_with_param", async () => {
      const result = await factory
        .createAPIRequest("simple-api", "get-product-by-id")
        .withURLParam("productId", "123")
        .execute();

      expect(result.status).toEqual("ok");
      expect(result.data).toEqual({
        id: "123",
        name: "Product 123",
      });
    });
    it("test_conditional_auth_headers_happy_path", async () => {
      expect(async () => {
        const result = await factory
          .createAPIRequest("admin-api", "get-product-full-data-by-id")
          .withURLParam("productId", "123")
          .execute();
        expect(result?.status).toEqual("ok");
        expect(result?.data).toEqual({
          id: "123",
          secret: "secret",
          name: "Product 123",
        });
        return result;
      }).not.toThrowError();
    });
    it("test_conditional_auth_headers_failure", async () => {
      try {
        const result = await factory
          .createAPIRequest("admin-api", "get-product-full-data-by-id")
          .blank()
          .withURLParam("productId", "123")
          .execute();
        expect(result?.status).toEqual("ok");
        expect(result?.data).toEqual({
          id: "123",
          secret: "secret",
          name: "Product 123",
        });
      } catch (e) {
        expect(e).toBeInstanceOf(HTTPError);
        expect(e).toHaveProperty("code", 401);
        expect(e.isUnauthorized()).toBeTruthy();
        expect(e.body).toEqual("Missing required header Authorization");
      }
    });

    it("test_modified_response_from_interceptor", async () => {
      const result = await factory
        .createAPIRequest("simple-api", "get-product-by-id")
        .withURLParam("productId", "123")
        .withResponseInterceptor(async (fetchResponse) => {
          const data = await fetchResponse.json();
          return {
            wrapped: data,
          };
        })
        .execute();
      expect(result).toHaveProperty("wrapped");
    });

    it("test_untouched_response_through_interceptor", async () => {
      const result = await factory
        .createAPIRequest("simple-api", "get-product-by-id")
        .withURLParam("productId", "123")
        .withResponseInterceptor(async (fetchResponse) => {})
        .execute();
      expect(result).toHaveProperty("status", "ok");
    });

    it("test_request_with_query_params", async () => {
      const url = "https://jsonplaceholder.typicode.com/posts";
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

    it("test_timeout", async () => {
      try {
        await factory
          .createGETRequest("http://localhost:8080/slow-response")
          .withTimeout(1000)
          .execute();
      } catch (e) {
        console.warn(e);
        expect(e).toBeInstanceOf(HTTPError);
        expect(e.isAborted()).toBeTruthy();
      }
    });
  } catch (e) {
    console.error(e);
  }

  it("test_basic_request_interceptor", async () => {
    const factory = new HTTPRequestFactory().withLogLevel("debug");
    const url = "https://jsonplaceholder.typicode.com/posts";
    const request = factory
      .withRequestInterceptor(async () => {
        return { body: "intercepted" };
      })
      .createGETRequest(url);
    const response = await request.execute();
    expect(response).toBeDefined();
    expect(response.body).toEqual("intercepted");
  });

  it("test_request_interceptor_rewrite_url", async () => {
    const factory = new HTTPRequestFactory().withLogLevel("debug");
    const url = "https://jsonplaceholder.typicode.com/users/2";
    const request = factory
      .withRequestInterceptor(async (_, { replaceURL }) => {
        replaceURL("https://jsonplaceholder.typicode.com/users/1");
      })
      .createGETRequest(url);
    const response = await request.execute();
    expect(response).toBeDefined();
    expect(response.id).toEqual(1);
  });

  it("test_request_interceptor_with_when", async () => {
    const factory = new HTTPRequestFactory()
      .withLogLevel("debug")
      .withAPIConfig({
        name: "default",
        endpoints: {
          getUser: {
            meta: {
              proxyOnce: true,
            },
            target: "https://jsonplaceholder.typicode.com/users/1",
          },
        },
      })
      .when((request) => request.meta.proxyOnce)
      .withRequestInterceptor(async (_, { deleteInterceptor }) => {
        deleteInterceptor();
        return {
          _localResponse: true,
          id: 1,
        };
      });
    let result = await factory.createAPIRequest("getUser").execute();
    expect(result.id).toEqual(1);
    expect(result._localResponse).toBeTruthy();

    result = await factory.createAPIRequest("getUser").execute();
    expect(result.id).toEqual(1);
    expect(result._localResponse).toBeUndefined();
  });
});

it("test_request_interceptor_from_api_config", async () => {
  const fixtures = {
    users: () => {
      return {
        type: "user",
      };
    },
    posts: () => {
      return {
        type: "post",
      };
    },
  };
  const factory = new HTTPRequestFactory().withLogLevel("debug").withAPIConfig({
    name: "default",
    requestInterceptors: [
     (request: HTTPRequest) => {
      const entity = request.meta.api.endpoint.target.replace(/^\//, "").replace(/\/\d+/, "");
        if (entity && fixtures[entity]) {
          return fixtures[entity]();
        }
      },
    ],
    baseURL : "https://jsonplaceholder.typicode.com",
    endpoints: {
      getUser: {
        target: "/users/1",
      },
      getPost: {
        target: "/posts/1",
      },
      getToDo: {
        target: "/todos/1",
      }
    }
  });

  let result = await factory.createAPIRequest("getUser").execute();
  expect(result).toHaveProperty("type", "user");

  result = await factory.createAPIRequest("getPost").execute();
  expect(result).toHaveProperty("type", "post");

  result = await factory.createAPIRequest("getToDo").execute();
  expect(result.type).toBeUndefined();
});
