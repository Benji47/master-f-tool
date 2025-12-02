async function initToken() {
  const client = new Appwrite.Client();
  client
    .setEndpoint("https://cloud.appwrite.io/v1")
    .setProject("692b61b1003bc020cdcf");
  
  const account = new Appwrite.Account(client);
  const response = await account.createJWT();
  return response.jwt;
}

let authToken = null;
const promise = initToken();
promise.then((token) => {
  authToken = token;
});

document.body.addEventListener("htmx:beforeRequest", (e) => {
  if (authToken == null) {
    e.preventDefault();
    promise.then(() => e.detail.issueRequest()); // TODO: Fix
  }
});

document.body.addEventListener("htmx:configRequest", (e) => {
  e.detail.headers["x-jwt"] = authToken;
});
