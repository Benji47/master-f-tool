import { Context } from "hono";

export function FAQPage({ c }: { c: Context }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-green-950 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 relative">
          <a href="/v1/lobby" className="absolute top-0 right-0">
            <button className="px-8 py-3 bg-gradient-to-r from-purple-600 to-fuchsia-500 hover:from-purple-700 hover:to-fuchsia-600 cursor-pointer text-white font-bold rounded-md transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-purple-500/25 font-[Orbitron]">
              ← Back to Lobby
            </button>
          </a>
          <h1 className="text-5xl font-bold text-white font-[Orbitron] mb-2">FAQ</h1>
          <p className="text-neutral-400">Frequently Asked Questions about Master F Tool</p>
        </div>

        {/* FAQ Bubbles/Boxes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Coins Logic Box */}
          <div className="bg-gradient-to-br from-yellow-900/40 to-amber-900/40 border-2 border-yellow-600/50 rounded-lg p-6 backdrop-blur-sm">
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-yellow-300 font-[Orbitron]">💰 Coins Logic</h2>
            </div>
            <div className="space-y-3 text-neutral-200">
              <div className="flex items-start gap-3">
                <span className="text-yellow-400 font-bold min-w-fit">Match Participation:</span>
                <span>+100 coins per match (everyone)</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-yellow-400 font-bold min-w-fit">Match Win:</span>
                <span>+100 coins (winners only)</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-yellow-400 font-bold min-w-fit">Goals Scored:</span>
                <span>+2 coins per goal</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-green-400 font-bold min-w-fit">Tournaments:</span>
                <span>Additional coins from tournament rewards</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-purple-400 font-bold min-w-fit">Betting (F Bet):</span>
                <span>Win coins through successful match predictions</span>
              </div>
            </div>
            <div className="mt-4 p-3 bg-neutral-800/50 rounded border border-yellow-600/20">
              <p className="text-xs text-neutral-300">💡 <span className="font-semibold">Tip:</span> Send coins to other players through the player profile panel! Coins can be used in the shop to purchase cosmetics and items.</p>
            </div>
          </div>

          {/* Levels & Badges Box */}
          <div className="bg-gradient-to-br from-blue-900/40 to-indigo-900/40 border-2 border-blue-600/50 rounded-lg p-6 backdrop-blur-sm">
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-blue-300 font-[Orbitron]">🎖️ Levels & Badges</h2>
            </div>
            <div className="space-y-3 text-neutral-200">
              <p>Gain XP to unlock badges and advance through 11 levels. Higher levels showcase your skill and dedication to the game.</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center bg-neutral-800/30 px-2 py-1 rounded">
                  <span>Win:</span>
                  <span className="text-green-400">+15 XP</span>
                </div>
                <div className="flex justify-between items-center bg-neutral-800/30 px-2 py-1 rounded">
                  <span>Loss:</span>
                  <span className="text-blue-400">+5 XP</span>
                </div>
                <div className="flex justify-between items-center bg-neutral-800/30 px-2 py-1 rounded">
                  <span>Perfect Win (10-0):</span>
                  <span className="text-yellow-400">+50 XP</span>
                </div>
                <div className="flex justify-between items-center bg-neutral-800/30 px-2 py-1 rounded">
                  <span>Per Goal:</span>
                  <span className="text-purple-400">+1 XP</span>
                </div>
              </div>
            </div>
          </div>

          {/* ELO & Ranks Box */}
          <div className="bg-gradient-to-br from-red-900/40 to-orange-900/40 border-2 border-red-600/50 rounded-lg p-6 backdrop-blur-sm">
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-red-300 font-[Orbitron]">📊 ELO & Ranks</h2>
            </div>
            <div className="space-y-3 text-neutral-200">
              <p>Climb the ranked ladder from Bronze to Grandmaster. Your ELO reflects your competitive skill.</p>
              <div className="space-y-2 text-sm">
                <p className="font-semibold text-red-300">Rank Tiers:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li><span className="text-amber-400">Bronze</span> (0-199)</li>
                  <li><span className="text-gray-400">Silver</span> (200-399)</li>
                  <li><span className="text-yellow-500">Gold</span> (400-599)</li>
                  <li><span className="text-sky-400">Platinum</span> (600-799)</li>
                  <li><span className="text-indigo-400">Diamond</span> (800-999)</li>
                  <li><span className="text-purple-400">Master</span> (1000-1199)</li>
                  <li><span className="text-red-400">Grandmaster</span> (1200+)</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Match Rules Box */}
          <div className="bg-gradient-to-br from-green-900/40 to-emerald-900/40 border-2 border-green-600/50 rounded-lg p-6 backdrop-blur-sm">
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-green-300 font-[Orbitron]">⚔️ Match Rules</h2>
            </div>
            <div className="space-y-3 text-neutral-200">
              <div className="flex items-start gap-3">
                <span className="text-green-400 font-bold min-w-fit">Players:</span>
                <span>4 players per match (2v2)</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-green-400 font-bold min-w-fit">Rounds:</span>
                <span>3 rounds total per match</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-green-400 font-bold min-w-fit">Scoring:</span>
                <span>Best of 3 rounds</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-green-400 font-bold min-w-fit">Vyrážečka:</span>
                <span>Bonus points, +10 XP per</span>
              </div>
            </div>
          </div>

          {/* Achievements Box */}
          <div className="bg-gradient-to-br from-orange-900/40 to-amber-900/40 border-2 border-orange-600/50 rounded-lg p-6 backdrop-blur-sm">
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-orange-300 font-[Orbitron]">🏆 Achievements</h2>
            </div>
            <div className="space-y-3 text-neutral-200">
              <p>Unlock achievements by reaching milestones and demonstrating skill.</p>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <span className="text-orange-400 min-w-fit">•</span>
                  <span>Level Up achievements</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-orange-400 min-w-fit">•</span>
                  <span>ELO rank progression</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-orange-400 min-w-fit">•</span>
                  <span>Shutout wins (10-0)</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-orange-400 min-w-fit">•</span>
                  <span>Vyrážečka milestones</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tournaments Box */}
          <div className="bg-gradient-to-br from-purple-900/40 to-fuchsia-900/40 border-2 border-purple-600/50 rounded-lg p-6 backdrop-blur-sm">
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-purple-300 font-[Orbitron]">🎪 Tournaments</h2>
            </div>
            <div className="space-y-3 text-neutral-200">
              <p>Compete in tournaments for glory and additional rewards!</p>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <span className="text-purple-400 min-w-fit">•</span>
                  <span>Create or join teams</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-purple-400 min-w-fit">•</span>
                  <span>Double elimination bracket</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-purple-400 min-w-fit">•</span>
                  <span>Compete for coins and bragging rights</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-purple-400 min-w-fit">•</span>
                  <span>View live tournament brackets</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Return to Lobby Button */}
        <div className="flex justify-center pb-6">
          <a href="/v1/lobby" className="inline-block">
            <button className="px-8 py-3 bg-gradient-to-r from-purple-600 to-fuchsia-500 hover:from-purple-700 hover:to-fuchsia-600 cursor-pointer text-white font-bold rounded-md transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-purple-500/25 font-[Orbitron]">
              ← Back to Lobby
            </button>
          </a>
        </div>
      </div>
    </div>
  );
}
