import { PlayerProfile } from "../../logic/profile";
import { formatCoins } from "../../logic/format";
import { badges, getBadgeByName, computeLevel, getLevelBadgeColor, getRankInfoFromElo } from "../../static/data";

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

export default function PlayerProfilePanel({ playerProfile, players, walletCoins }: { playerProfile: PlayerProfile; players: PlayerProfile[]; walletCoins?: number }) {
  const lvl = computeLevel(playerProfile.xp);
  const rank = getRankInfoFromElo(playerProfile.elo);
  const badgeColor = getLevelBadgeColor(lvl.level);
  const currentBadge = badges[lvl.level - 1];
  const winrate = playerProfile.wins + playerProfile.loses > 0
    ? Math.round((playerProfile.wins / (playerProfile.wins + playerProfile.loses)) * 100)
    : 0;
  const transferTargets = players.filter((p) => p.username !== playerProfile.username);

  // Parse owned badges
  const ownedBadges: string[] = playerProfile.ownedBadges 
    ? (typeof playerProfile.ownedBadges === 'string' ? JSON.parse(playerProfile.ownedBadges) : playerProfile.ownedBadges)
    : [];
  
  // Get all level-based badges player has earned
  const earnedLevelBadges = badges.slice(0, lvl.level).map(b => b.name);
  
  // Combine owned badges and earned badges (remove duplicates)
  const allOwnedBadges = Array.from(new Set([...earnedLevelBadges, ...ownedBadges]));
  
  // Currently selected badge
  const selectedBadge = playerProfile.selectedBadge || currentBadge?.name || "Unranked";
  const selectedBadgeData = getBadgeByName(selectedBadge);
  const badgeToShow = selectedBadgeData || currentBadge;

  return (
    <>
    <div className="lg:col-span-1 bg-neutral-900/60 rounded-lg border-2 border-purple-600/50 p-5 flex flex-col justify-between relative">
      <div className="space-y-4">
        {/* Header - Username + Rank */}
        <div className="text-center pb-3 border-b border-purple-600/30">
          <h2 className="text-2xl font-bold text-white font-[Orbitron] mb-1">{playerProfile.username}</h2>
          <p className="text-sm text-neutral-400">{rank.name} • {playerProfile.elo} ELO</p>
        </div>

        {/* Level Card */}
        <div className="bg-neutral-800/50 rounded-lg border border-purple-600/30 p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-neutral-400 uppercase tracking-wider">Level</span>
                <span className="text-lg font-bold text-white">{lvl.level}</span>
              </div>
              <div className="text-xs text-neutral-400 mb-2">{lvl.xpInCurrentLevel}/{lvl.xpNeededForNext} XP</div>
              <div className="w-full bg-neutral-700 rounded-full h-1.5 overflow-hidden border border-purple-600/20">
                <div className="h-1.5 bg-gradient-to-r from-blue-500 to-purple-500" style={{ width: `${lvl.progress}%` }} />
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className={`${badgeToShow?.bg || badgeColor.bg} ${badgeToShow?.text || badgeColor.text} px-3 py-2 rounded text-sm font-semibold`}>
                {renderBadgeName(badgeToShow?.name || "Unranked", badgeToShow?.iconUrl)}
              </span>
              <button
                type="button"
                onclick="document.getElementById('badge-modal')?.showModal()"
                className="px-2.5 py-1 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white text-xs font-bold rounded transition-colors"
                title="Set badge"
              >
                Set Badge
              </button>
            </div>
          </div>
        </div>

        {/* ELO Card */}
        <div className="bg-neutral-800/50 rounded-lg border border-purple-600/30 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-neutral-400 uppercase tracking-wider">Rank Progress</span>
            <span className="text-sm font-semibold text-white">{rank.name}</span>
          </div>
          <div className="text-xs text-neutral-400 mb-2">{playerProfile.elo} ELO • {rank.min}-{rank.max}</div>
          <div className="w-full bg-neutral-700 rounded-full h-1.5 overflow-hidden border border-purple-600/20">
            <div className={`h-1.5 bg-gradient-to-r ${rank.color}`} style={{ width: `${rank.progress}%` }} />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-neutral-800/50 rounded-lg border border-neutral-700/30 p-2">
            <div className="text-xs text-neutral-400 mb-1">Matches</div>
            <div className="text-lg font-bold text-white">{playerProfile.wins + playerProfile.loses}</div>
            <div className="text-xs text-neutral-500">({(playerProfile.wins + playerProfile.loses)/3} games)</div>
          </div>
          <div className="bg-neutral-800/50 rounded-lg border border-neutral-700/30 p-2">
            <div className="text-xs text-neutral-400 mb-1">Winrate</div>
            <div className="text-lg font-bold text-green-400">{winrate}%</div>
            <div className="text-xs text-neutral-500">{playerProfile.wins}W-{playerProfile.loses}L</div>
          </div>
          <div className="bg-neutral-800/50 rounded-lg border border-neutral-700/30 p-2">
            <div className="text-xs text-neutral-400 mb-1">Goals</div>
            <div className="text-lg font-bold text-white">{playerProfile.goals_scored}:{playerProfile.goals_conceded}</div>
            <div className="text-xs text-neutral-500">Scored:Conceded</div>
          </div>
          <div className="bg-neutral-800/50 rounded-lg border border-neutral-700/30 p-2">
            <div className="text-xs text-neutral-400 mb-1">Vyrážečka</div>
            <div className="text-lg font-bold text-orange-400">{playerProfile.vyrazecky}</div>
            <div className="text-xs text-neutral-500">{playerProfile.goals_scored > 0 ? Math.round(playerProfile.vyrazecky / playerProfile.goals_scored * 10000) / 100 : 0}%</div>
          </div>
        </div>

        {/* Achievements Row */}
        <div className="bg-neutral-800/30 rounded-lg border border-purple-600/20 p-3">
          <div className="text-xs text-neutral-400 uppercase tracking-wider mb-2">Achievements</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between">
              <span className="text-neutral-400">Ultimate Wins:</span>
              <span className="font-semibold text-purple-300">{playerProfile.ultimate_wins}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">10-0 Wins:</span>
              <span className="font-semibold text-yellow-300">{playerProfile.ten_zero_wins}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Ultimate Loss:</span>
              <span className="font-semibold text-red-300">{playerProfile.ultimate_loses}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">0-10 Loss:</span>
              <span className="font-semibold text-red-300">{playerProfile.ten_zero_loses}</span>
            </div>
          </div>
        </div>

        {/* Coins Section */}
        <div className="bg-neutral-800/50 rounded-lg border border-yellow-600/30 p-3">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-neutral-400 uppercase tracking-wider">💰 Balance</span>
            <span className="text-xl font-bold text-yellow-400">{formatCoins(walletCoins ?? playerProfile.coins)}</span>
          </div>
          <form action="/v1/coins/send" method="post" className="space-y-2">
            <select
              name="recipient"
              className="w-full bg-neutral-700 border border-neutral-600 text-neutral-100 rounded px-2 py-1 text-xs"
              required
            >
              <option value="">Send to player...</option>
              {transferTargets.map((p) => (
                <option key={p.$id} value={p.username}>{p.username}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <input
                name="amount"
                type="number"
                min="1"
                step="1"
                className="flex-1 bg-neutral-700 border border-neutral-600 text-neutral-100 rounded px-2 py-1 text-xs"
                placeholder="Amount"
                required
              />
              <button
                type="submit"
                className="px-3 py-1 bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 text-white text-xs font-bold rounded transition-colors"
              >
                Send
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
    <dialog
      id="badge-modal"
      className="backdrop:bg-black/70 rounded-lg bg-neutral-900/95 border border-purple-600/50 p-0 w-full max-w-md"
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-white font-[Orbitron]">Choose Your Badge</h3>
          <button
            type="button"
            onclick="document.getElementById('badge-modal')?.close()"
            className="text-neutral-400 hover:text-white"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form action="/v1/profile/select-badge" method="post" className="space-y-3">
          <select
            name="badgeName"
            className="w-full bg-neutral-800 border border-neutral-600 text-neutral-100 rounded px-3 py-2 text-sm"
          >
            <option value="">No badge (default)</option>
            {allOwnedBadges.map((badgeName) => (
              <option key={badgeName} value={badgeName}>
                {badgeName}
              </option>
            ))}
          </select>

          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 px-3 py-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white text-sm font-bold rounded transition-colors"
            >
              Equip Badge
            </button>
            <button
              type="submit"
              name="badgeName"
              value=""
              formNoValidate
              className="px-3 py-2 bg-neutral-700 hover:bg-neutral-600 text-neutral-200 text-sm rounded transition-colors"
            >
              Unequip
            </button>
          </div>
        </form>
      </div>
    </dialog>
    </>
  );
}
