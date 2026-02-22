import { Context } from "hono";

export function RegisterPage({ c }: { c: Context }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-green-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-green-500 to-emerald-500 bg-clip-text text-transparent mb-2 font-[Orbitron]">
            REGISTER
          </h1>
        </div>

        <div className="bg-neutral-900/50 backdrop-blur-sm rounded-lg border border-neutral-800 p-6 shadow-2xl">
          <form id="registerForm" action="/v1/auth/register" method="post" className="space-y-6">
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
                placeholder="Choose a username"
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
                placeholder="Enter password"
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-md text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 font-[Exo_2]"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-neutral-200 font-[Exo_2]">
                Confirm Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                required
                placeholder="Repeat password"
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-md text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 font-[Exo_2]"
              />
            </div>

            <div id="regError" className="text-red-400 text-sm" aria-live="polite"></div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white cursor-pointer font-bold py-3 px-4 rounded-md transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-green-500/25 font-[Orbitron] text-lg"
            >
              REGISTER
            </button>
          </form>

          <a href="/v1/auth/admin-login" className="mt-3 block text-center text-sm text-purple-400 hover:text-purple-300">
            Login as admin
          </a>

          <div className="mt-4 text-center">
            <a href="/" className="text-sm text-neutral-400 hover:text-neutral-200">
              Back to home
            </a>
          </div>
        </div>
      </div>

      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function(){
              var form = document.getElementById('registerForm');
              var err = document.getElementById('regError');
              form && form.addEventListener('submit', function(e){
                err.textContent = '';
                var p = document.getElementById('password').value;
                var cp = document.getElementById('confirmPassword').value;
                if(!p || !cp || p !== cp){
                  e.preventDefault();
                  err.textContent = 'Passwords must match.';
                }
              });
            })();
          `,
        }}
      />
    </div>
  );
}
