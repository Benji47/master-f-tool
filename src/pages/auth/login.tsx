import { Context } from "hono";

export function LoginPage({ c }: { c: Context }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-green-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-green-500 to-emerald-500 bg-clip-text text-transparent mb-2 font-[Orbitron]">
            LOGIN
          </h1>
        </div>

        <div className="bg-neutral-900/50 backdrop-blur-sm rounded-lg border border-neutral-800 p-6 shadow-2xl">
          <form action="/v1/auth/login" method="post" className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="username" className="block text-sm font-medium text-neutral-200 font-[Exo_2]">
                Username
              </label>
              <input
                autoFocus={true}
                type="text"
                id="username"
                name="username"
                required
                placeholder="Enter your username"
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-md text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 font-[Exo_2]"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-neutral-200 font-[Exo_2]">
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                required
                placeholder="Enter your password"
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-md text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 font-[Exo_2]"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 cursor-pointer text-white font-bold py-3 px-4 rounded-md transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-green-500/25 font-[Orbitron] text-lg"
            >
              LOGIN
            </button>
          </form>

          <div className="mt-4 text-center">
            <a href="/" className="text-sm text-neutral-400 hover:text-neutral-200">
              Back to home
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
