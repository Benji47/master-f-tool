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
  type: 'physical' | 'badge' | 'cosmetic';
  badgeName?: string; // For badge items
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
    id: 'lunch',
    name: 'Lunch',
    description: 'Delicious lunch of your choice',
    price: 10000000,
    icon: '🍔',
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

    // If it's a badge, check if player already owns it
    if (item.type === 'badge' && item.badgeName) {
      const ownedBadges: string[] = profile.ownedBadges 
        ? (typeof profile.ownedBadges === 'string' ? JSON.parse(profile.ownedBadges) : profile.ownedBadges)
        : [];
      
      if (ownedBadges.includes(item.badgeName)) {
        return { success: false, message: 'You already own this badge!' };
      }
    }

    // Deduct coins from player
    const newCoins = profile.coins - item.price;
    await databases.updateDocument(databaseId, profileCollectionId, username, {
      coins: newCoins,
    });

    // If it's a badge, add to owned badges
    if (item.type === 'badge' && item.badgeName) {
      const ownedBadges: string[] = profile.ownedBadges 
        ? (typeof profile.ownedBadges === 'string' ? JSON.parse(profile.ownedBadges) : profile.ownedBadges)
        : [];
      
      ownedBadges.push(item.badgeName);
      
      await databases.updateDocument(databaseId, profileCollectionId, username, {
        ownedBadges: JSON.stringify(ownedBadges),
      });
    }

    // Create order record
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
        status: 'pending',
        purchasedAt: new Date().toISOString(),
      }
    );

    return {
      success: true,
      message: `Successfully purchased ${item.name}!`,
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
