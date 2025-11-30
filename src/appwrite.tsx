import app from "./server";

export default async function (context: any) {
  const request = requestFromContext(context);
  const response = await app.request(request);
  return await responseForContext(context, response);
}

/**
 * Convert Open Runtimes context to JavaScript native Request
 */
export function requestFromContext(context: any) {
  const headers = new Headers();
  for (const header of Object.keys(context.req.headers)) {
    headers.set(header, context.req.headers[header]);
  }

  let body = context.req.bodyRaw;
  if (context.req.method === "GET" || context.req.method === "HEAD") {
    body = undefined;
  }

  const request = new Request(context.req.url, {
    method: context.req.method,
    body,
    headers,
  });

  return request;
}

/**
 * Convert native JavaScript Response to Open Runtimes context response
 */
export async function responseForContext(context: any, response: any) {
  const headers: any = {};
  for (const pair of response.headers.entries()) {
    const [key, value] = pair;
    
    if(!headers[key]) {
      headers[key] = value;
    } else {
      headers[key] = [
        ...(Array.isArray(headers[key]) ? headers[key] : [headers[key]]),
        value
      ]
    }
  }

  return context.res.send(await response.text(), response.status, headers);
}
