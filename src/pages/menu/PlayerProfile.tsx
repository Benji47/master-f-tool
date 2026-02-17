import { PlayerProfile } from "../../logic/profile";
import { badges, rankTiers, computeLevel, getLevelBadgeColor, getRankInfoFromElo } from "../../static/data";

function renderBadgeName(name: string, iconUrl?: string) {
  if (!iconUrl) return <span>{name}</span>;

  return (
    <span className="inline-flex items-center gap-2">
      <span>{name}</span>
      <img
        src={iconUrl}
        alt={`${name} icon`}
        className="w-5 h-5 object-contain drop-shadow-sm align-text-bottom"
        loading="lazy"
        decoding="async"
      />
    </span>
  );
}

export default function PlayerProfilePanel({ playerProfile, players }: { playerProfile: PlayerProfile; players: PlayerProfile[] }) {
  const lvl = computeLevel(playerProfile.xp);
  const rank = getRankInfoFromElo(playerProfile.elo);
  const badgeColor = getLevelBadgeColor(lvl.level);
  const winrate = playerProfile.wins + playerProfile.loses > 0
    ? Math.round((playerProfile.wins / (playerProfile.wins + playerProfile.loses)) * 100)
    : 0;
  const transferTargets = players.filter((p) => p.username !== playerProfile.username);

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
                    <div
                      key={b.name}
                      className="flex items-center justify-between bg-neutral-800/40 rounded px-2 py-1"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`${b.bg} ${b.text} px-2 py-0.5 rounded text-xs font-semibold w-26 text-left inline-flex items-center gap-2`}
                        >
                          {renderBadgeName(b.name, (b as any).iconUrl)}
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

              {/* POPUP: Ranks Grid - 8 columns (2 rows of 4) */}
              <div className="absolute -left-2 top-full mt-2 bg-neutral-900/95 border border-neutral-700 rounded-lg p-4 z-50 shadow-lg text-sm
                                  opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity duration-150 overflow-y-auto"
                   style={{ width: '1400px', maxHeight: '85vh' }}>
                <div className="flex flex-col gap-4">
                  {[
                    ["zElo", "Bronze", "Silver", "Gold"],
                    ["Platinum", "Diamond", "Master", "Grandmaster"]
                  ].map((rankRow, rowIdx) => (
                    <div key={`row-${rowIdx}`} className="flex gap-4">
                      {rankRow.map((rankName) => {
                        const tiers = rankTiers.filter(t => t.name.startsWith(rankName));
                        
                        if (tiers.length === 0) return null;
                        
                        const firstTier = tiers[0];
                        const rankColors: Record<string, string> = {
                          'zElo': 'bg-gray-700/30',
                          'Bronze': 'bg-amber-900/40',
                          'Silver': 'bg-slate-600/40',
                          'Gold': 'bg-yellow-700/40',
                          'Platinum': 'bg-cyan-600/40',
                          'Diamond': 'bg-blue-600/40',
                          'Master': 'bg-purple-600/40',
                          'Grandmaster': 'bg-red-600/40'
                        };

                        return (
                          <div key={rankName} 
                            className={`flex-1 rounded-lg p-3 border-2 ${rankColors[rankName] || 'bg-neutral-800/40'}`}
                            style={{ 
                              borderColor: firstTier.textColor.split(' ').pop()
                            }}>
                            <div className={`text-lg font-bold text-center mb-3 ${firstTier.textColor}`}>
                              {rankName === 'zElo' ? '🥬 zElo' : rankName}
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                              {tiers.map((tier) => {
                                const playersInTier = players.filter((p) => getRankInfoFromElo(p.elo).name === tier.name);
                                const sortedPlayers = playersInTier.sort((a, b) => b.elo - a.elo);

                                return (
                                  <div key={tier.name} className="flex flex-col gap-2 bg-neutral-800/50 rounded p-2">
                                    <div className="flex items-center justify-between gap-1">
                                      <div className="flex items-center gap-1">
                                        <div className={`w-6 h-2 rounded-full bg-gradient-to-r ${tier.color}`} />
                                        <div className={`${tier.textColor} text-xs font-bold`}>
                                          {tier.name.split(" ")[1]}
                                        </div>
                                      </div>
                                      <div className="text-neutral-400 text-xs">
                                        ({tier.min}-{tier.max})
                                      </div>
                                    </div>

                                    {sortedPlayers.length > 0 ? (
                                      <ul className="text-neutral-300 text-xs list-disc pl-3 max-h-32 overflow-y-auto">
                                        {sortedPlayers.map((p) => (
                                          <li key={p.username} className="truncate">
                                            {p.username} ({p.elo})
                                          </li>
                                        ))}
                                      </ul>
                                    ) : (
                                      <div className="text-neutral-600 text-xs italic"></div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
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
        
        <div className="mb-6">
              <p className={`text-xl font-bold ${rank.colorKey} mb-2`}>{rank.name}</p>
              <div className="relative group">
                <div className="flex items-center gap-2 mb-3">
                  <p className="text-m text-neutral-300 cursor-help">{playerProfile.elo} ELO</p>
                  <div className="w-5 h-5 rounded-full bg-neutral-700 text-neutral-300 flex items-center justify-center text-xs font-bold cursor-help group-hover:bg-neutral-600">
                    i
                  </div>
                </div>
                <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block bg-neutral-800 text-neutral-200 text-xs rounded p-2 w-84 border border-neutral-700 z-10">
                  <p className="font-bold mb-1 text-blue-400">ELO Changes:</p>
                  <p className="text-green-400">• Win: +20 ELO</p>
                  <p className="text-red-400">• Lose: -20 ELO</p>
                  <p className="text-green-400">• Ultimate Winner: 2 ELO from each opponent (total +6) </p>
                  <p className="text-red-400">• Ultimate Loser: 1 ELO to each opponent (total -3)</p>
                  <p>• ELO difference: (max ±10)</p>
                  <p className="pl-4 text-neutral-300">• ±min(10, avg elo difference / 25)</p>
                </div>
              </div>

              <div className="w-full bg-neutral-800 rounded-full h-2 mt-2 overflow-hidden">
                <div className={`h-2 rounded-full bg-gradient-to-r ${rank.color}`} style={{ width: `${rank.progress}%` }} />
              </div>

              <div className="flex justify-between text-xs mt-1 text-neutral-400">
                <span>{rank.min}</span>
                <span>{rank.max}</span>
              </div>
            </div>
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
            <span className="text-orange-400">{playerProfile.vyrazecky} ({playerProfile.goals_scored > 0 ? Math.round(playerProfile.vyrazecky / playerProfile.goals_scored * 10000) / 100 : 0} %)</span>
          </div>
        </div>

        <div className="w-11/12 mb-5 mt-5 mx-auto h-px bg-white/35 my-3 rounded" />

        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-neutral-300">
            <span className="text-yellow-400">💰 Coins:</span>
            <span className="text-yellow-400 font-bold text-lg">{playerProfile.coins}</span>
          </div>
          <form action="/v1/coins/send" method="post" className="mt-3 flex flex-col gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-neutral-400" htmlFor="profile-coin-recipient">Send to</label>
              <select
                id="profile-coin-recipient"
                name="recipient"
                className="bg-neutral-900 border border-neutral-700 text-neutral-100 rounded-md px-2 py-1"
                required
              >
                <option value="">Select player</option>
                {transferTargets.map((p) => (
                  <option key={p.$id} value={p.username}>{p.username}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="profile-coin-amount"
                name="amount"
                type="number"
                min="1"
                step="1"
                className="flex-1 bg-neutral-900 border border-neutral-700 text-neutral-100 rounded-md px-2 py-1"
                placeholder="Amount"
                required
              />
              <button
                type="submit"
                className="px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-black font-bold rounded-md transition-colors"
              >
                Send
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
