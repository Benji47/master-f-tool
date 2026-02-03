import { getRankInfoFromElo } from '../../static/data';

interface Achievement {
  $id?: string;
  timestamp: number;
  type: string;
  playerId: string;
  username: string;
  data: {
    oldValue?: number;
    newValue?: number;
    vyrazeckaCount?: number;
    matchId?: string;
    details?: string;
  };
}

function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) return `${hours}h ${minutes}m ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'just now';
}

function getAchievementIcon(type: string): string {
  switch (type) {
    case 'elo_rank_up':
      return '📈';
    case 'elo_rank_down':
      return '📉';
    case 'level_up':
      return '⭐';
    case 'shutout_win':
      return '🔥';
    case 'golden_vyrazecka':
      return '✨';
    case 'vyrazecka':
      return '⚡';
    default:
      return '🎯';
  }
}

function getAchievementText(achievement: Achievement): string {
  const { type, username, data } = achievement;

  switch (type) {
    case 'elo_rank_up': {
      const oldRank = getRankInfoFromElo(data.oldValue || 0);
      const newRank = getRankInfoFromElo(data.newValue || 0);
      const rankChanged = oldRank.name !== newRank.name;
      
      if (rankChanged) {
        return `${username} ranked up! ${oldRank.name} (${data.oldValue}) → ${newRank.name} (${data.newValue})`;
      }
    }
    case 'elo_rank_down': {
      const oldRank = getRankInfoFromElo(data.oldValue || 0);
      const newRank = getRankInfoFromElo(data.newValue || 0);
      const rankChanged = oldRank.name !== newRank.name;
      
      if (rankChanged) {
        return `${username} ranked down ${oldRank.name} (${data.oldValue}) → ${newRank.name} (${data.newValue})`;
      }
    }
    case 'level_up':
      return `${username} leveled up to Level ${data.newValue}!`;
    case 'shutout_win':
      return `${username} scored a shutout 10-0 win!`;
    case 'golden_vyrazecka':
      return `${username} got a golden vyrážečka!`;
    case 'vyrazecka':
      if (data.vyrazeckaCount == 1) {
        return `${username} scored 1 vyrážečka!`;
      }
      return `${username} scored ${data.vyrazeckaCount} vyrážečky!`;
    default:
      return `${username} achieved something!`;
  }
}

function getAchievementColor(type: string): string {
  switch (type) {
    case 'elo_rank_up':
      return 'border-green-500 bg-green-950/30';
    case 'elo_rank_down':
      return 'border-red-500 bg-red-950/30';
    case 'level_up':
      return 'border-yellow-500 bg-yellow-950/30';
    case 'shutout_win':
      return 'border-orange-500 bg-orange-950/30';
    case 'golden_vyrazecka':
      return 'border-purple-500 bg-purple-950/30';
    case 'vyrazecka':
      return 'border-blue-500 bg-blue-950/30';
    default:
      return 'border-neutral-500 bg-neutral-950/30';
  }
}

export function DailyAchievementsPanel({ achievements }: { achievements: Achievement[] }) {
  if (!achievements || achievements.length === 0) {
    return (
      <div className="bg-neutral-900/50 rounded-lg border border-neutral-800 p-4">
        <h2 className="text-lg font-bold text-white mb-3">🏆 Daily Log</h2>
        <p className="text-neutral-400 text-sm">No logs in the last 24 hours</p>
      </div>
    );
  }

  return (
    <div className="bg-neutral-900/50 rounded-lg border border-neutral-800 p-4">
      <h2 className="text-lg font-bold text-white mb-3">🏆 Daily Log</h2>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {achievements.map((achievement) => (
          <div
            key={achievement.$id}
            className={`border-l-4 ${getAchievementColor(achievement.type)} rounded px-3 py-2 text-sm`}
          >
            <div className="flex items-start gap-2">
              <span className="text-lg flex-shrink-0">{getAchievementIcon(achievement.type)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold truncate">
                  {getAchievementText(achievement)}
                </p>
                <p className="text-neutral-400 text-xs">
                  {formatTimeAgo(achievement.timestamp)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
