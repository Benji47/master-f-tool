import { PlayerProfile } from "../../v1/profile";
import { badges, rankTiers, computeLevel, getLevelBadgeColor, getRankInfoFromElo } from "../../static/data";

export default function PlayerProfilePanel({ playerProfile, players }: { playerProfile: PlayerProfile; players: PlayerProfile[] }) {
  const lvl = computeLevel(playerProfile.xp);
  const rank = getRankInfoFromElo(playerProfile.elo);
  const badgeColor = getLevelBadgeColor(lvl.level);
  const winrate = playerProfile.wins + playerProfile.loses > 0
    ? Math.round((playerProfile.wins / (playerProfile.wins + playerProfile.loses)) * 100)
    : 0;

  return (
    <div className="lg:col-span-1 bg-neutral-900/50 rounded-lg border border-neutral-800 p-6 flex flex-col justify-between relative">
      <div>
        {/* Top row: username + small hover buttons */}
        <div className="flex items-center justify-between">
          <div className="flex-1 flex justify-center">
            <h2 className="text-2xl font-bold text-white font-[Orbitron] mb-3 text-center">
              {playerProfile.username}
            </h2>
          </div>

          {/* Buttons container (right of username) */}
          <div className="flex gap-2 items-start ml-2">
            {/* Levels Hover Button */}
            <div className="relative group">
              <button
                type="button"
                className="px-3 py-1 text-xs text-white/30 rounded-md bg-neutral-800/60 border border-neutral-700 hover:bg-neutral-700 transition-colors"
              >
                Levels
              </button>

              {/* POPUP: Levels */}
              <div className="absolute -left-2 top-full mt-2 w-90 bg-neutral-900/95 border border-neutral-700 rounded-lg p-4 z-50 shadow-lg text-sm
                                  opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity duration-150">
                <h4 className="font-bold mb-2 text-white">Levels & Badges</h4>

                <div className="space-y-2">
                  {badges.map((b, idx) => (
                    <div key={b.name} className="flex items-center justify-between bg-neutral-800/40 rounded px-2 py-1">
                      <div className="flex items-center gap-2">
                        <span className={`${b.bg} ${b.text} px-2 py-0.5 rounded text-xs font-semibold w-26 text-left`}>
                          {b.name}
                        </span>
                        <div className="text-neutral-200 text-sm">
                          Level {idx + 1} ({b.minLevel} - {b.maxLevel})
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Ranks Hover Button */}
            <div className="relative group">
              <button
                type="button"
                className="px-3 py-1 text-xs text-white/30 rounded-md bg-neutral-800/60 border border-neutral-700 hover:bg-neutral-700 transition-colors"
              >
                Ranks
              </button>

              {/* POPUP: Ranks Grid */}
              <div className="absolute -left-2 top-full mt-2 w-[1300px] bg-neutral-900/95 border border-neutral-700 rounded-lg p-4 z-50 shadow-lg text-sm
                                  opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity duration-150">
                <div className="grid grid-cols-6 gap-4">
                  {["zElo","Bronze", "Silver", "Gold", "Platinum", "Diamond", "Master", "Grandmaster"].map((rankName) => {
                    const tiers = rankTiers.filter(t => t.name.startsWith(rankName));
                    const titleColor = tiers[0]?.textColor ?? "text-white";

                    let playersInRank = players.filter((p) => getRankInfoFromElo(p.elo).name.split(" ")[0] === rankName);
                    playersInRank = playersInRank.sort((a, b) => b.elo - a.elo);

                    return (
                      <div key={rankName} className="flex flex-col gap-2">
                        <div className={`font-semibold mb-1 ${titleColor}`}>{rankName}</div>

                        {tiers.map((tier) => (
                          <div key={tier.name} className="flex items-center gap-2 bg-neutral-800/40 rounded px-2 py-1">
                            <div className={`w-8 h-3 rounded-full bg-gradient-to-r ${tier.color}`} />
                            <div className={`${tier.textColor} text-xs font-semibold`}>
                              {tier.name} ({tier.min}-{tier.max})
                            </div>
                          </div>
                        ))}

                        <div className="mt-1 pl-4">
                          {playersInRank.length > 0 ? (
                            <ul className="text-neutral-300 text-xs list-disc">
                              {playersInRank.map((p) => (
                                <li key={p.username}>
                                  {p.username} — {p.elo} ELO
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <div className="text-neutral-600 text-xs">No players</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* divider */}
        <div className="w-11/12 mb-5 mt-3 mx-auto h-px bg-white/35 my-3 rounded" />

        {/* Profile Level Section */}
        <div className="mb-6">
          <div className={`${badgeColor.bg} ${badgeColor.text} px-4 py-2 rounded-md font-bold text-center text-2xl mb-3`}>
            Level {lvl.level} [{badges[lvl.level - 1]?.name || "Unranked"}]
          </div>

          {/* XP Info with Hover */}
          <div className="relative group">
            <div className="flex items-center gap-2 mb-2">
              <p className="text-sm text-neutral-300 cursor-help">{lvl.xpInCurrentLevel}/{lvl.xpNeededForNext} XP</p>
              <div className="w-5 h-5 rounded-full bg-neutral-700 text-neutral-300 flex items-center justify-center text-xs font-bold cursor-help group-hover:bg-neutral-600">
                i
              </div>
            </div>
            <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block bg-neutral-800 text-neutral-200 text-xs rounded p-2 w-48 border border-neutral-700 z-10">
              <p className="font-bold mb-1 text-blue-400">XP Gains:</p>
              <p>• Win: +15 XP</p>
              <p>• Lose: +5 XP</p>
              <p>• Ultimate Winner: +25 XP</p>
              <p>• Perfect Win (10-0): +50 XP</p>
              <p>• Goal: +1 XP</p>
              <p>• Vyrážečka: +10 XP</p>
            </div>
          </div>

          {/* XP Progress Bar */}
          <div className="w-full bg-neutral-800 rounded-full h-2 mt-2 overflow-hidden">
            <div className="h-2 rounded-full bg-gradient-to-r from-green-400 to-emerald-400" style={{ width: `${lvl.progress}%` }} />
          </div>

          <div className="flex justify-between text-xs mt-1 text-neutral-400">
            <span>0</span>
            <span>{lvl.xpNeededForNext}</span>
          </div>
        </div>

        {/* ...small summary metrics (wins/loses/goals) ... */}
        <div className="w-11/12 mb-5 mt-5 mx-auto h-px bg-white/35 my-3 rounded" />

        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-neutral-300">
            <span className="text-blue-400">Total Matches (games):</span>
            <span className="text-blue-400">{playerProfile.wins + playerProfile.loses} ({(playerProfile.wins + playerProfile.loses)/3})</span>
          </div>
          <div>
            <div className="flex justify-between text-neutral-300">
              <span className="text-green-400">Wins:</span>
              <span className="text-green-400">{playerProfile.wins} ({winrate}%)</span>
            </div>
            <div className="flex justify-between ml-4 text-sm text-neutral-400">
              <span className="text-green-400">• Ultimate Wins</span>
              <span className="text-green-400">{playerProfile.ultimate_wins}</span>
            </div>
            <div className="flex justify-between ml-4 text-sm text-neutral-400">
              <span className="text-green-400">• 10-0 wins</span>
              <span className="text-green-400">{playerProfile.ten_zero_wins}</span>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-neutral-300">
              <span className="text-red-400">Loses:</span>
              <span className="text-red-400">{playerProfile.loses} ({100 - winrate}%)</span>
            </div>
            <div className="flex justify-between ml-4 text-sm text-neutral-400">
              <span className="text-red-400">• Ultimate Loses</span>
              <span className="text-red-400">{playerProfile.ultimate_loses}</span>
            </div>
            <div className="flex justify-between ml-4 text-sm text-neutral-400">
              <span className="text-red-400">• 0-10 loses</span>
              <span className="text-red-400">{playerProfile.ten_zero_loses}</span>
            </div>
          </div>
        </div>

        <div className="w-11/12 mb-5 mt-5 mx-auto h-px bg-white/35 my-3 rounded" />

        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-neutral-300">
            <span className="text-purple-400">Goals (Scored:Conceded):</span>
            <span className="text-purple-400">{playerProfile.goals_scored}:{playerProfile.goals_conceded}</span>
          </div>
          <div className="flex justify-between text-neutral-300">
            <span className="text-orange-400">Vyrážečka Count:</span>
            <span className="text-orange-400">{playerProfile.vyrazecky}</span>
          </div>
          <div className="flex justify-between text-neutral-300">
            <span className="text-orange-400">Vyrážečka %:</span>
            <span className="text-orange-400">{playerProfile.goals_scored + playerProfile.goals_conceded > 0 ? Math.round(playerProfile.vyrazecky / (playerProfile.goals_scored + playerProfile.goals_conceded) * 10000) / 100 : 0} %</span>
          </div>
        </div>
      </div>
    </div>
  );
}
