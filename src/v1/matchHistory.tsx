import { Context } from "hono";
import { MatchDoc } from "./match";

export function MatchHistoryPage({ c, matches, username }: { c: Context; matches: MatchDoc[]; username: string | null}) {
  return (
    <div class="p-6 text-white max-w-2xl mx-auto">
      {/* HEADER ROW */}
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-3xl font-bold">Match History</h1>

        { username ? (
          <a href={`/v1/match-history/players/${username}`}>
            <button class="tab-btn px-4 py-2 bg-neutral-700 hover:bg-neutral-600 cursor-pointer text-white rounded-md font-semibold transition-colors">
              Your Matches
            </button>
          </a>
        ) : (
          <a href={`/v1/match-history`}>
            <button class="tab-btn px-4 py-2 bg-neutral-700 hover:bg-neutral-600 cursor-pointer text-white rounded-md font-semibold transition-colors">
              All Matches
            </button>
          </a>
        )}

        <button onclick="history.back()" class="px-4 py-2 bg-red-500 border-red-500 text-white rounded-md hover:bg-red-600 cursor-pointer font-semibold transition-colors">
          Back
        </button>
      </div>

      <div class="flex flex-col gap-4">
        {matches.length === 0 ? (
          <p>No matches have been played yet.</p>
        ) : (
          matches.map((m) => (
            <a
              href={`/v1/match-history/${m.$id}`}
              class="p-4 bg-neutral-900 rounded-xl hover:bg-neutral-800 transition flex flex-col gap-2"
            >
              {/* Top row */}
              <div class="flex justify-between items-center">
                <span class="text-lg font-semibold">Match #{m.$id}</span>
                <span class="opacity-70 text-sm">
                  {new Date(m.createdAt || Date()).toLocaleString()}
                </span>
              </div>

              {/* Players list */}
              <div class="flex flex-wrap gap-2 text-sm">
                {m.players.map((p, i) => (
                  <span class="px-2 py-1 bg-neutral-800 rounded-md">
                    {p} <span class="opacity-60">({p.username})</span>
                  </span>
                ))}
              </div>
            </a>
          ))
        )}
      </div>
    </div>
  );
}
