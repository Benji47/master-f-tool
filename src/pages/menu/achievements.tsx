import { Context } from "hono";
import { getCookie } from "hono/cookie";
import { getPlayerProfile, getLeaderboard } from "../../logic/profile";
import { getAllAchievementsForPlayer, getAchievementColorClass, formatUnlockDate, ACHIEVEMENT_DEFINITIONS } from "../../logic/achievements";

interface AchievementsViewProps {
  c: Context;
  viewingPlayerId?: string;
}

export async function AchievementsPage({ c, viewingPlayerId }: AchievementsViewProps) {
  const currentUserId = getCookie(c, "user") ?? "";
  const targetPlayerId = viewingPlayerId || currentUserId;
  const isViewingOther = viewingPlayerId && viewingPlayerId !== currentUserId;
  const tabValue = c.req.query('tab') || 'unlocked';
  const tab = (tabValue === 'locked' ? 'locked' : 'unlocked') as 'unlocked' | 'locked'; // Get tab from query parameter

  try {
    const targetProfile = await getPlayerProfile(targetPlayerId);
    const { unlocked, locked } = await getAllAchievementsForPlayer(targetPlayerId);
    const allPlayers = await getLeaderboard(500); // Get up to 500 players for dropdown

    if (!targetProfile) {
      return (
        <div className="max-w-4xl mx-auto p-6 bg-neutral-900/60 rounded-lg border border-neutral-800">
          <h1 className="text-2xl font-bold mb-4 text-red-400">Player Not Found</h1>
          <a href="/v1/lobby" className="inline-block px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded text-sm">Back to Lobby</a>
        </div>
      );
    }

    const progressPercentage = Math.round((unlocked.length / ACHIEVEMENT_DEFINITIONS.length) * 100);

    return (
      <div className="max-w-5xl mx-auto p-6">
        {/* Header */}
        <div className="bg-neutral-900/60 rounded-lg border border-neutral-800 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-white">{targetProfile.username}'s Achievements</h1>
              {isViewingOther && (
                <p className="text-neutral-400 text-sm mt-2">Viewing another player's achievements</p>
              )}
            </div>
            <form method="get" className="flex items-center gap-2">
              <label htmlFor="player-select" className="text-neutral-300 text-sm font-medium">
                Select Player:
              </label>
              <select
                id="player-select"
                name="player"
                value={viewingPlayerId || currentUserId}
                className="px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-sm text-white focus:outline-none focus:border-neutral-500 cursor-pointer"
              >
                <option value="" className="text-white bg-neutral-800">Your Achievements</option>
                {allPlayers.map((player) => (
                  <option key={player.$id} value={player.$id} className="text-white bg-neutral-800">
                    {player.username} ({player.elo} Elo)
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium text-white transition-colors"
              >
                View
              </button>
            </form>
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-neutral-300">Progress</span>
              <span className="text-neutral-400 text-sm">{unlocked.length} / {ACHIEVEMENT_DEFINITIONS.length}</span>
            </div>
            <div className="w-full bg-neutral-800 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-600 to-purple-600 h-full transition-all"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <p className="text-neutral-400 text-sm mt-2">{progressPercentage}% Complete</p>
          </div>
        </div>

        {/* Unlocked Achievements */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4 text-green-400">
            ✓ Unlocked Achievements ({unlocked.length})
          </h2>
          {unlocked.length === 0 ? (
            <div className="bg-neutral-900/60 rounded-lg border border-neutral-800 p-8 text-center">
              <p className="text-neutral-400">No achievements unlocked yet. Keep playing!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...unlocked].sort((a, b) => {
                const rarityOrder = { legendary: 0, epic: 1, rare: 2, common: 3 };
                const aRarity = rarityOrder[a.definition?.rarity as keyof typeof rarityOrder] ?? 4;
                const bRarity = rarityOrder[b.definition?.rarity as keyof typeof rarityOrder] ?? 4;
                return aRarity - bRarity;
              }).map((achievement) => {
                const colors = getAchievementColorClass(achievement.definition?.rarity || 'common');
                return (
                  <div
                    key={achievement.$id}
                    className={`rounded-lg border-2 ${colors.border} ${colors.bg} p-4 backdrop-blur-sm`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-3xl">{achievement.definition?.icon}</div>
                      <div className="flex-1">
                        <h3 className="font-bold text-white">{achievement.definition?.name}</h3>
                        <p className="text-sm text-neutral-300 mb-2">{achievement.definition?.description}</p>
                        <p className="text-xs text-neutral-500">Unlocked {formatUnlockDate(achievement.unlockedAt)}</p>
                        {achievement.definition?.rarity && (
                          <span className="inline-block mt-2 px-2 py-1 bg-neutral-800 rounded text-xs uppercase font-semibold">
                            {achievement.definition.rarity}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Locked Achievements */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4 text-neutral-400">
            🔒 Locked Achievements ({locked.length})
          </h2>
          {locked.length === 0 ? (
            <div className="bg-neutral-900/60 rounded-lg border border-neutral-800 p-8 text-center">
              <p className="text-green-400 font-bold">🎉 You've unlocked all achievements!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...locked].sort((a, b) => {
                const rarityOrder = { legendary: 0, epic: 1, rare: 2, common: 3 };
                const aRarity = rarityOrder[a.rarity as keyof typeof rarityOrder] ?? 4;
                const bRarity = rarityOrder[b.rarity as keyof typeof rarityOrder] ?? 4;
                return aRarity - bRarity;
              }).map((achievement) => {
                const colors = getAchievementColorClass(achievement.rarity);
                return (
                  <div
                    key={achievement.achievementId}
                    className={`rounded-lg border-2 ${colors.border} ${colors.bg} p-4 backdrop-blur-sm opacity-60`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-3xl filter grayscale">{achievement.icon}</div>
                      <div className="flex-1">
                        <h3 className="font-bold text-white">{achievement.name}</h3>
                        <p className="text-sm text-neutral-400 mb-2">{achievement.description}</p>
                        {achievement.requirement && (
                          <p className="text-xs text-neutral-500 italic">
                            Requirement: {achievement.requirement.description || achievement.requirement.type}
                          </p>
                        )}
                        <span className="inline-block mt-2 px-2 py-1 bg-neutral-800 rounded text-xs uppercase font-semibold">
                          {achievement.rarity}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Back Button */}
        <div className="mt-8">
          <a
            href="/v1/lobby"
            className="inline-block px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded text-sm font-medium text-pink-200 hover:text-pink-100"
          >
            ← Back to Lobby
          </a>
        </div>
      </div>
    );
  } catch (error) {
    console.error("Error loading achievements:", error);
    return (
      <div className="max-w-4xl mx-auto p-6 bg-neutral-900/60 rounded-lg border border-neutral-800">
        <h1 className="text-2xl font-bold mb-4 text-red-400">Error Loading Achievements</h1>
        <a href="/v1/lobby" className="inline-block px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded text-sm">Back to Lobby</a>
      </div>
    );
  }
}

