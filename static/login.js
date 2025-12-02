const client = new Appwrite.Client();
client
  .setEndpoint("https://cloud.appwrite.io/v1")
  .setProject("692b61b1003bc020cdcf");

const account = new Appwrite.Account(client);

document.addEventListener("alpine:init", () => {
  Alpine.data("login", () => ({
    username: "",
    password: "",

    async submit() {
      try {
        await account.createEmailPasswordSession({
          email: this.username + "@local.example",
          password: this.password,
        });
        window.location.href = '/v1/lobby';
      } catch (error) {
        alert(error.message ?? error.toString());
      }
    },
  }));
});
