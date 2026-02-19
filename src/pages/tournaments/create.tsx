import { Context } from "hono";

export function CreateTournamentPage({ c }: { c: Context }) {
  return (
    <div className="max-w-2xl mx-auto p-6 text-neutral-100">
      <h1 className="text-3xl font-bold mb-8 text-white">Create Tournament</h1>

      <form hx-post="/v1/api/tournaments/create" hx-swap="redirect:" className="space-y-6">
        
        {/* Tournament Name */}
        <div>
          <label className="block text-sm font-semibold mb-2 text-white">Tournament Name</label>
          <input
            type="text"
            name="name"
            required
            placeholder="e.g. Winter Championship 2026"
            className="w-full px-4 py-2 bg-neutral-700 border border-neutral-600 rounded focus:border-purple-500 focus:outline-none text-white placeholder-neutral-400"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-semibold mb-2 text-white">Description (optional)</label>
          <textarea
            name="description"
            placeholder="Tournament details, rules, etc."
            rows={3}
            className="w-full px-4 py-2 bg-neutral-700 border border-neutral-600 rounded focus:border-purple-500 focus:outline-none text-white placeholder-neutral-400 resize-none"
          />
        </div>

        {/* Max Teams */}
        <div>
          <label className="block text-sm font-semibold mb-2 text-white">Maximum Teams</label>
          <select
            name="maxTeams"
            defaultValue="16"
            className="w-full px-4 py-2 bg-neutral-700 border border-neutral-600 rounded focus:border-purple-500 focus:outline-none text-white"
          >
            <option value="4">4 Teams (2 matches)</option>
            <option value="8">8 Teams (Double Elimination)</option>
            <option value="16" selected>16 Teams (Recommended)</option>
            <option value="32">32 Teams (Large)</option>
          </select>
          <p className="text-sm text-neutral-400 mt-1">Non-power-of-two numbers will have bye matches</p>
        </div>

        {/* Submit */}
        <div className="flex gap-4">
          <button
            type="submit"
            className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded font-semibold transition"
          >
            Create Tournament
          </button>
          <a
            href="/v1/tournaments"
            className="px-6 py-3 bg-neutral-800 hover:bg-neutral-700 rounded font-semibold transition text-center"
          >
            Cancel
          </a>
        </div>
      </form>

      {/* Info Box */}
      <div className="mt-12 p-6 bg-neutral-900/60 rounded-lg border border-neutral-800">
        <h3 className="text-lg font-bold mb-4 text-white">How Tournaments Work</h3>
        <ul className="space-y-3 text-neutral-300 text-sm">
          <li>✓ <span className="font-semibold">Create</span> - Create a tournament and invite teammates</li>
          <li>✓ <span className="font-semibold">Form Teams</span> - Create 2-person teams or join existing ones</li>
          <li>✓ <span className="font-semibold">Double Elimination</span> - Losers get a second chance in the losers bracket</li>
          <li>✓ <span className="font-semibold">Rewards</span> - Top 4 teams earn coins and medals</li>
          <li>✓ <span className="font-semibold">No ELO Changes</span> - Tournament matches don't affect your ranked stats</li>
        </ul>
      </div>
    </div>
  );
}
