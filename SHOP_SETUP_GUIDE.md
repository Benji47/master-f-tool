# Shop & Badge System Setup Guide

## Overview

This guide covers the new **Shop** and **Badge Selection** features added to Mars Empire. Players can now:
- Purchase items from the shop using coins
- Buy exclusive badges
- Select and equip badges to display on their profile
- Admins can view all purchase orders

## Database Setup

### 1. Create Shop Orders Collection

Create a new collection in Appwrite:

**Collection ID**: `shop_orders`

**Attributes**:

| Attribute | Type | Size | Required | Default | Note |
|-----------|------|------|----------|---------|------|
| `userId` | String | 256 | Yes | - | Player who made purchase |
| `username` | String | 256 | Yes | - | Player username |
| `itemId` | String | 256 | Yes | - | Item identifier (e.g., 'lunch', 'tshirt', 'badge_millionaire') |
| `itemName` | String | 256 | Yes | - | Display name of item |
| `price` | Integer | - | Yes | - | Price in coins at purchase time |
| `status` | String | 50 | Yes | 'pending' | Values: pending, fulfilled, cancelled |
| `purchasedAt` | DateTime | - | Yes | - | Timestamp of purchase |

**Indexes**:
- `userId` (key index) - for querying user's orders
- `purchasedAt` (key index) - for sorting by date

**Permissions**:
- Read: Any (or restricted to admins only)
- Create: Any authenticated user
- Update: Admins only (for status changes)
- Delete: Admins only

### 2. Update Players Profile Collection

Add two new attributes to the existing `players-profile` collection:

| Attribute | Type | Size | Required | Default | Array | Note |
|-----------|------|------|----------|---------|-------|------|
| `ownedBadges` | String | 5000 | No | "[]" | No | JSON array of badge names |
| `selectedBadge` | String | 256 | No | null | No | Currently equipped badge |

**Important Notes**:
- `ownedBadges` stores a JSON string array: `["Millionaire 💰", "Rookie ♖"]`
- `selectedBadge` must be from the player's `ownedBadges` or level badges
- Both fields are optional and will be auto-populated as needed

## Features

### Shop Items

Currently available in the shop:

1. **Lunch** 🍔
   - Price: 10,000,000 coins
   - Type: Physical item
   - Admin fulfillment required

2. **Foosball T-Shirt** 👕
   - Price: 1,000,000,000 coins
   - Type: Physical item
   - Admin fulfillment required

3. **Millionaire Badge** 💰
   - Price: 1,000,000 coins
   - Type: Badge (automatically added to profile)
   - No fulfillment needed

### Badge System

**How Badges Work**:
- Players earn badges by leveling up (XP-based)
- Players can purchase exclusive badges from the shop
- Players can select which badge to display on their profile
- Owned badges are stored in `ownedBadges` field
- Selected badge is stored in `selectedBadge` field

**Badge Types**:
1. **Level Badges** (earned by XP):
   - Rookie ♖ (Level 0-1)
   - Šnekpán 🐌 (Level 1-3)
   - Cleaner 🧹 (Level 3-5)
   - Own goals master 🥅🫣 (Level 5-7)
   - Gods hand 🫳 (Level 7-9)
   - Ťukač do tyček (Level 9-11)
   - Tryhard (Level 11+)
   - And more...

2. **Shop Badges** (purchased):
   - Millionaire 💰 (1,000,000 coins)
   - More can be added in the future

## User Workflow

### Purchasing from Shop

1. Player navigates to **Lobby**
2. Clicks the **Shop** button (🛒 in bottom-right of grid)
3. Browses available items
4. Clicks **"🛒 Purchase"** on desired item
5. System checks:
   - Player has enough coins
   - Badge not already owned (for badge items)
6. Coins deducted from player balance
7. Order created in database
8. Badge added to `ownedBadges` (if applicable)
9. Success/error message displayed

### Selecting/Equipping Badge

1. Player views their profile in **Lobby** (left panel)
2. Sees **"🎖️ Display Badge"** section
3. Dropdown shows all owned badges:
   - Level badges earned so far
   - Shop badges purchased
4. Player selects badge from dropdown
5. Clicks **"Equip Badge"**
6. Badge immediately updates on profile
7. Badge displays in matches, leaderboards, etc.

**Unequipping Badge**:
- Click the **✕** button next to "Equip Badge"
- Badge reverts to default level badge

## Admin Tasks

### Viewing Orders

Currently, orders can be viewed directly in Appwrite console:
1. Navigate to `shop_orders` collection
2. Filter by `status: pending` to see unfulfilled orders
3. View `username`, `itemName`, `price`, and `purchasedAt`

### Fulfilling Physical Orders

When a player purchases a physical item (lunch, t-shirt):

1. Check `shop_orders` collection for `status: pending`
2. Note the `username` and `itemName`
3. Fulfill the order in real life (deliver lunch, give t-shirt)
4. Update order `status` to `fulfilled`
5. Optional: Add fulfillment notes in a custom field

### Cancelling Orders

If order cannot be fulfilled:
1. Update order `status` to `cancelled`
2. Manually refund coins to player:
   - Find player in `players-profile` collection
   - Add refund amount to `coins` field
3. Optional: Notify player

## File Structure

### New Files Created

```
src/
├── logic/
│   └── shop.ts                    # Shop logic (purchase, orders)
├── pages/
│   └── menu/
│       └── shop.tsx               # Shop page UI
```

### Modified Files

```
src/
├── logic/
│   ├── profile.tsx                # Added badge selection functions
│   └── siteContent.ts             # (previous work)
├── pages/
│   └── menu/
│       ├── lobby.tsx              # Added shop button
│       └── PlayerProfile.tsx      # Added badge selector
├── static/
│   └── data.ts                    # Added Millionaire badge
├── server.tsx                     # Added shop & badge routes
└── DATABASE_SCHEMA.json           # Added shop_orders schema
```

## Code Reference

### Adding New Shop Items

Edit [src/logic/shop.ts](src/logic/shop.ts):

```typescript
export const SHOP_ITEMS: ShopItem[] = [
  // Existing items...
  {
    id: 'new_item_id',
    name: 'New Item Name',
    description: 'Item description',
    price: 500000,
    icon: '🎁',
    type: 'physical', // or 'badge' or 'cosmetic'
    badgeName: 'Badge Name 💎', // Only if type is 'badge'
  },
];
```

### Adding New Badges

Edit [src/static/data.ts](src/static/data.ts):

```typescript
export const shopBadges: Badge[] = [
  // Existing badges...
  {
    name: 'New Badge 🏅',
    minLevel: 0,
    maxLevel: 999999,
    bg: 'bg-gradient-to-r from-blue-500 to-purple-600',
    text: 'text-white',
  },
];
```

Then add corresponding shop item in `shop.ts`.

### Logic Functions

**Shop Functions** ([src/logic/shop.ts](src/logic/shop.ts)):
- `purchaseItem(userId, username, itemId)` - Purchase item, deduct coins, add badge
- `getAllOrders()` - Get all orders (admin)
- `getUserOrders(userId)` - Get user's orders
- `updateOrderStatus(orderId, status)` - Update order status (admin)

**Badge Functions** ([src/logic/profile.tsx](src/logic/profile.tsx)):
- `getOwnedBadges(username)` - Get player's badge collection
- `selectBadge(username, badgeName)` - Equip/unequip badge
- `addOwnedBadge(username, badgeName)` - Add badge to collection (level up)

## Routes

### Shop Routes
- `GET /v1/shop` - Shop page
- `POST /v1/shop/purchase` - Purchase item (body: `itemId`)

### Badge Routes
- `POST /v1/profile/select-badge` - Select badge (body: `badgeName`)

### Admin Routes (Future)
- `GET /v1/admin/orders` - View all orders
- `POST /v1/admin/orders/:id/fulfill` - Mark order fulfilled
- `POST /v1/admin/orders/:id/cancel` - Cancel and refund order

## Testing Checklist

### Before Launch

- [ ] Create `shop_orders` collection in Appwrite
- [ ] Add `ownedBadges` and `selectedBadge` attributes to `players-profile`
- [ ] Set collection permissions correctly
- [ ] Test purchasing with sufficient coins
- [ ] Test purchasing with insufficient coins
- [ ] Test purchasing badge already owned
- [ ] Test badge selection from profile
- [ ] Test badge unequipping
- [ ] Test physical item order creation
- [ ] Verify orders appear in database
- [ ] Test admin order viewing

### After Launch

- [ ] Monitor order fulfillment workflow
- [ ] Check for coin balance issues
- [ ] Verify badge display across pages
- [ ] Collect feedback on shop items
- [ ] Plan new items/badges based on player requests

## Future Enhancements

Potential improvements:
- [ ] Admin order management page
- [ ] Order history for players
- [ ] Item inventory/stock system
- [ ] Limited-time shop items
- [ ] Discount system
- [ ] Gift items to other players
- [ ] Bundle deals
- [ ] Achievement-based badges
- [ ] Animated badge effects
- [ ] Badge rarity system
- [ ] Trading system for badges

## Troubleshooting

### Player Can't Purchase Item

**Problem**: "Not enough coins" error appears even with sufficient balance

**Solution**:
1. Check player's `coins` field in `players-profile` collection
2. Verify item price in `SHOP_ITEMS` array
3. Check for pending transactions that may have locked coins
4. Check server logs for errors

### Badge Doesn't Appear in Selector

**Problem**: Purchased badge not showing in dropdown

**Solution**:
1. Check `ownedBadges` field in player's profile
2. Verify badge was added to JSON array
3. Check badge name matches exactly (including emoji)
4. Reload page to fetch updated data

### Order Not Created

**Problem**: Purchase succeeds but no order in database

**Solution**:
1. Check Appwrite permissions on `shop_orders` collection
2. Verify collection ID matches `shop_orders`
3. Check server logs for database errors
4. Ensure player has valid `userId`

### Selected Badge Not Displaying

**Problem**: Selected badge doesn't show on profile

**Solution**:
1. Check `selectedBadge` field in player profile
2. Verify badge name is in `ownedBadges` array
3. Check `getBadgeByName()` function returns correct badge
4. Refresh player profile data

## Support

For issues or questions:
1. Check Appwrite console for database errors
2. Review server logs (`bun run dev` output)
3. Verify environment variables are set
4. Check this documentation for setup steps
5. Review code in `src/logic/shop.ts` and `src/logic/profile.tsx`

---

**Last Updated**: February 2026  
**Version**: 1.0.0
