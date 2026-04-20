import { updateProfileInMemory } from "./memoryStore";
import { addBonusSpins } from "./freeSpins";

const sdk = require('node-appwrite');

const endpoint = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const projectId = process.env.APPWRITE_PROJECT;
const apiKey = process.env.APPWRITE_KEY;
const databaseId = process.env.APPWRITE_DATABASE_ID;
const ordersCollectionId = 'shop_orders';
const profileCollectionId = 'players-profile';

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  icon: string;
  type: 'physical' | 'badge' | 'cosmetic' | 'spins';
  badgeName?: string; // For badge items
  spinCount?: number; // For spins items
  repeatable?: boolean; // If true, player can buy multiple times
}

export interface ShopOrder {
  $id: string;
  userId: string;
  username: string;
  itemId: string;
  itemName: string;
  price: number;
  status: 'pending' | 'fulfilled' | 'cancelled';
  purchasedAt: string;
}

// Available shop items
export const SHOP_ITEMS: ShopItem[] = [
  {
    id: 'spins_5',
    name: '5 Extra Spins',
    description: '5 bonus spins on the wheel — use them anytime on top of your daily 10',
    price: 750,
    icon: '🎰',
    type: 'spins',
    spinCount: 5,
    repeatable: true,
  },
  {
    id: 'spins_20',
    name: '20 Extra Spins',
    description: '20 bonus spins at a better price — great value pack',
    price: 2500,
    icon: '🎰',
    type: 'spins',
    spinCount: 20,
    repeatable: true,
  },
  {
    id: 'spins_100',
    name: '100 Extra Spins',
    description: 'The whale pack — 100 spins for the rich and brave',
    price: 10000,
    icon: '💎',
    type: 'spins',
    spinCount: 100,
    repeatable: true,
  },
  {
    id: 'icecream',
    name: 'Ice Cream',
    description: 'Sweet ice cream treat',
    price: 5000000,
    icon: '🍦',
    type: 'physical',
  },
  {
    id: 'tshirt',
    name: 'Foosball T-Shirt',
    description: 'Official F t-shirt',
    price: 1000000000,
    icon: '👕',
    type: 'physical',
  },
  {
    id: 'badge_millionaire',
    name: 'Millionaire Badge',
    description: 'Exclusive badge for the wealthy players',
    price: 1000000,
    icon: '💰',
    type: 'badge',
    badgeName: 'Millionaire 💰',
  },
  {
    id: 'badge_dragon',
    name: 'Dragon Badge',
    description: 'Fear the flame',
    price: 10000000,
    icon: '🐉',
    type: 'badge',
    badgeName: 'Dragon 🐉',
  },
  {
    id: 'badge_alien',
    name: 'Alien Badge',
    description: 'Not from this planet',
    price: 15000000,
    icon: '👽',
    type: 'badge',
    badgeName: 'Alien 👽',
  },
  {
    id: 'badge_skull',
    name: 'Skull Badge',
    description: 'Death on the foosball table',
    price: 25000000,
    icon: '💀',
    type: 'badge',
    badgeName: 'Skull 💀',
  },
  {
    id: 'badge_crown',
    name: 'Crown Badge',
    description: 'The king of foosball',
    price: 50000000,
    icon: '👑',
    type: 'badge',
    badgeName: 'Crown 👑',
  },
  {
    id: 'badge_billionaire',
    name: 'Billionaire Badge',
    description: 'The ultimate status symbol for the richest players',
    price: 1000000000,
    icon: '💎',
    type: 'badge',
    badgeName: 'Billionaire 💎',
  },
];

export function getShopItem(itemId: string): ShopItem | undefined {
  return SHOP_ITEMS.find(item => item.id === itemId);
}

/**
 * Purchase an item from the shop
 * Deducts coins, creates order, and if badge - adds to owned badges
 */
export async function purchaseItem(
  userId: string,
  username: string,
  itemId: string
): Promise<{ success: boolean; message: string; order?: ShopOrder }> {
  if (!projectId || !apiKey) {
    throw new Error('Appwrite credentials not configured');
  }

  const client = new sdk.Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);

  const databases = new sdk.Databases(client);

  try {
    const item = getShopItem(itemId);
    if (!item) {
      return { success: false, message: 'Item not found' };
    }

    // Get player profile
    const profile = await databases.getDocument(databaseId, profileCollectionId, username);
    
    // Check if player has enough coins
    if (profile.coins < item.price) {
      return {
        success: false,
        message: `Not enough coins! You need ${item.price.toLocaleString()} coins but only have ${profile.coins.toLocaleString()}.`
      };
    }

    // One-time-purchase items (badges, physical): block re-purchase.
    if (!item.repeatable) {
      const existingOrders = await databases.listDocuments(
        databaseId,
        ordersCollectionId,
        [
          sdk.Query.equal('userId', userId),
          sdk.Query.equal('itemId', itemId),
          sdk.Query.limit(1),
        ]
      );
      if (existingOrders.documents.length > 0) {
        return { success: false, message: 'You already purchased this item!' };
      }
    }

    // Deduct coins (and add badge if applicable) in one update
    const updateData: Record<string, any> = {
      coins: profile.coins - item.price,
    };
    if (item.type === 'badge' && item.badgeName) {
      const ownedBadges: string[] = profile.ownedBadges
        ? (typeof profile.ownedBadges === 'string' ? JSON.parse(profile.ownedBadges) : profile.ownedBadges)
        : [];
      ownedBadges.push(item.badgeName);
      updateData.ownedBadges = JSON.stringify(ownedBadges);
    }
    const updatedProfile = await databases.updateDocument(databaseId, profileCollectionId, username, updateData);
    updateProfileInMemory(updatedProfile);

    // Spins items: instantly grant bonus spins (auto-fulfilled).
    if (item.type === 'spins' && item.spinCount && item.spinCount > 0) {
      try {
        await addBonusSpins(username, item.spinCount);
      } catch (e: any) {
        console.error('failed to grant bonus spins', e);
        // Refund if spin grant failed
        try {
          const refunded = await databases.updateDocument(databaseId, profileCollectionId, username, { coins: profile.coins });
          updateProfileInMemory(refunded);
        } catch {}
        return { success: false, message: 'Failed to grant spins, purchase refunded.' };
      }
    }

    // Create order record — fulfilled instantly for digital items.
    const autoFulfilled = item.type === 'spins' || item.type === 'badge' || item.type === 'cosmetic';
    const order = await databases.createDocument(
      databaseId,
      ordersCollectionId,
      sdk.ID.unique(),
      {
        userId,
        username,
        itemId: item.id,
        itemName: item.name,
        price: item.price,
        status: autoFulfilled ? 'fulfilled' : 'pending',
        purchasedAt: new Date().toISOString(),
      }
    );

    const successMsg = item.type === 'spins'
      ? `🎰 ${item.spinCount} bonus spins added to your account!`
      : `Successfully purchased ${item.name}!`;

    return {
      success: true,
      message: successMsg,
      order,
    };
  } catch (error: any) {
    console.error('Shop purchase error:', error);
    return { 
      success: false, 
      message: error.message || 'Failed to complete purchase' 
    };
  }
}

/**
 * Get all orders (admin only)
 */
export async function getAllOrders(): Promise<ShopOrder[]> {
  if (!projectId || !apiKey) {
    throw new Error('Appwrite credentials not configured');
  }

  const client = new sdk.Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);

  const databases = new sdk.Databases(client);

  try {
    const response = await databases.listDocuments(
      databaseId,
      ordersCollectionId,
      [
        sdk.Query.orderDesc('purchasedAt'),
        sdk.Query.limit(100),
      ]
    );

    return response.documents;
  } catch (error) {
    console.error('Failed to fetch orders:', error);
    return [];
  }
}

/**
 * Get orders for a specific user
 */
export async function getUserOrders(userId: string): Promise<ShopOrder[]> {
  if (!projectId || !apiKey) {
    throw new Error('Appwrite credentials not configured');
  }

  const client = new sdk.Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);

  const databases = new sdk.Databases(client);

  try {
    const response = await databases.listDocuments(
      databaseId,
      ordersCollectionId,
      [
        sdk.Query.equal('userId', userId),
        sdk.Query.orderDesc('purchasedAt'),
      ]
    );

    return response.documents;
  } catch (error) {
    console.error('Failed to fetch user orders:', error);
    return [];
  }
}

/**
 * Update order status (admin only)
 */
export async function updateOrderStatus(
  orderId: string,
  status: 'pending' | 'fulfilled' | 'cancelled'
): Promise<ShopOrder | null> {
  if (!projectId || !apiKey) {
    throw new Error('Appwrite credentials not configured');
  }

  const client = new sdk.Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);

  const databases = new sdk.Databases(client);

  try {
    const order = await databases.updateDocument(
      databaseId,
      ordersCollectionId,
      orderId,
      { status }
    );

    return order;
  } catch (error) {
    console.error('Failed to update order status:', error);
    return null;
  }
}
