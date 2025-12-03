import { Context } from 'hono';

export function Homepage({ c }: { c: Context }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-green-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <img
            src="/icon.jpg"
            alt="App Icon"
            className="w-32 h-32 object-contain drop-shadow-xl"
          />
        </div>

        {/* Hero Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-green-500 to-emerald-500 bg-clip-text text-transparent mb-2 font-[Orbitron]">
            MASTER F TOOL
          </h1>
        </div>

    {/* Game Form */}
        <div className="flex gap-3 mb-6">
        <a href="/v1/auth/login" className="flex-1">
            <button
            type="button"
            className="w-full px-4 py-2 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 cursor-pointer hover:to-green-600 text-white font-bold rounded-md transition-all duration-200 font-[Orbitron]"
            >
            LOGIN
            </button>
        </a>
        <a href="/v1/auth/register" className="flex-1">
            <button
            type="button"
            className="w-full px-4 py-2 bg-transparent hover:bg-neutral-800 text-white font-bold cursor-pointer rounded-md border border-neutral-700 transition-all duration-200 font-[Orbitron]"
            >
            REGISTER
            </button>
        </a>
        </div>

        {/* Footer Text */}
        <div className="text-center mt-6">
          <p className="text-neutral-500 text-sm font-[Exo_2]">
            Rise to the top of table football glory!
          </p>
        </div>
      </div>
    </div>
  );
}
