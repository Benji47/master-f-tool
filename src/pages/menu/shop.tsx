import { Context } from "hono";
import { SHOP_ITEMS, ShopItem } from "../../logic/shop";
import { PlayerProfile } from "../../logic/profile";

export function ShopPage({ 
  c, 
  profile,
  message,
}: { 
  c: Context; 
  profile: PlayerProfile;
  message?: { type: 'success' | 'error'; text: string };
}) {
  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Shop - Mars Empire</title>
        <link rel="stylesheet" href="/dist/styles.css" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 min-h-screen text-white">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold font-[Orbitron] text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500">
                🛒 F Shop
              </h1>
              <p className="text-neutral-400 mt-2">Spend your hard-earned coins!</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="text-2xl font-bold font-[Orbitron] text-yellow-400">
                💰 {profile.coins.toLocaleString()} coins
              </div>
              <a
                href="/v1/lobby"
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors text-sm text-white"
              >
                ← Back to Lobby
              </a>
            </div>
          </div>

          {/* Message */}
          {message && (
            <div
              className={`mb-6 p-4 rounded-lg border ${
                message.type === 'success'
                  ? 'bg-green-900/30 border-green-700 text-green-300'
                  : 'bg-red-900/30 border-red-700 text-red-300'
              }`}
            >
              {message.text}
            </div>
          )}

          {/* Shop Items Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {SHOP_ITEMS.map((item) => (
              <ShopItemCard key={item.id} item={item} playerCoins={profile.coins} />
            ))}
          </div>

          {/* Info Section */}
          <div className="mt-12 bg-neutral-900/60 border border-neutral-800 rounded-lg p-6">
            <h2 className="text-xl font-bold font-[Orbitron] mb-4 text-white">ℹ️ Shop Information</h2>
            <div className="space-y-2 text-neutral-300">
              <p>• All purchases are final and will be recorded in the order history</p>
              <p>• Badges will be automatically added to your profile after purchase</p>
              <p>• Physical items (lunch, t-shirt) will be fulfilled by admins</p>
              <p>• Make sure you have enough coins before purchasing!</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}

function ShopItemCard({ 
  item, 
  playerCoins 
}: { 
  item: ShopItem; 
  playerCoins: number;
}) {
  const canAfford = playerCoins >= item.price;
  const itemTypeColors = {
    physical: 'from-blue-600 to-blue-800',
    badge: 'from-purple-600 to-purple-800',
    cosmetic: 'from-pink-600 to-pink-800',
  };

  return (
    <div className="bg-neutral-900/60 border border-neutral-800 rounded-lg overflow-hidden hover:border-neutral-700 transition-all hover:scale-105">
      {/* Item Type Badge */}
      <div className={`bg-gradient-to-r ${itemTypeColors[item.type]} px-4 py-2 text-center text-sm font-semibold text-white`}>
        {item.type.toUpperCase()}
      </div>

      {/* Item Content */}
      <div className="p-6">
        <div className="text-6xl text-center mb-4">{item.icon}</div>
        <h3 className="text-xl font-bold font-[Orbitron] text-center mb-2 text-white">{item.name}</h3>
        <p className="text-neutral-300 text-sm text-center mb-4">{item.description}</p>

        {/* Price */}
        <div className="text-center mb-4">
          <div className="text-2xl font-bold text-yellow-400 font-[Orbitron]">
            💰 {item.price.toLocaleString()}
          </div>
          <div className="text-xs text-neutral-400">coins</div>
        </div>

        {/* Purchase Button */}
        <form method="post" action="/v1/shop/purchase">
          <input type="hidden" name="itemId" value={item.id} />
          <button
            type="submit"
            disabled={!canAfford}
            className={`w-full py-3 px-4 rounded-lg font-semibold transition-all ${
              canAfford
                ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white'
                : 'bg-neutral-800 text-neutral-600 cursor-not-allowed'
            }`}
          >
            {canAfford ? '🛒 Purchase' : '🔒 Not Enough Coins'}
          </button>
        </form>

        {!canAfford && (
          <div className="text-xs text-red-400 text-center mt-2">
            Need {(item.price - playerCoins).toLocaleString()} more coins
          </div>
        )}
      </div>
    </div>
  );
}
