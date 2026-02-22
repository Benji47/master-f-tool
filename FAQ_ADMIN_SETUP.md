# FAQ Admin Editor - Setup Guide

## Overview

The FAQ Admin Editor allows administrators to dynamically edit the Match Rules section in the FAQ page without modifying code. The content is stored in an Appwrite database collection.

## Database Setup

### 1. Create the `faq_config` Collection

In your Appwrite console:

1. Navigate to **Databases** → Select your database
2. Click **Create Collection**
3. Set Collection ID: `faq_config`
4. Set Collection Name: `FAQ Configuration`

### 2. Add Attributes

Add the following attributes to the `faq_config` collection:

#### Attribute 1: `key`
- **Type**: String
- **Size**: 256
- **Required**: Yes
- **Array**: No
- **Description**: Configuration key (e.g., 'match_rules')

#### Attribute 2: `content`
- **Type**: String
- **Size**: 10000
- **Required**: Yes
- **Array**: No
- **Description**: JSON string content containing the FAQ data

#### Attribute 3: `updatedAt`
- **Type**: DateTime
- **Required**: No
- **Array**: No  
- **Description**: Timestamp of last update

### 3. Add Index

Create a unique index for the `key` attribute:

- **Type**: Unique
- **Attribute**: `key`
- **Index Key**: `key_unique`

### 4. Set Permissions

Set collection permissions:

- **Read Access**: Any (or Role: All Users)
- **Create Access**: Admin only
- **Update Access**: Admin only
- **Delete Access**: Admin only

## Usage

### Access the FAQ Editor

1. Log in as admin user
2. Navigate to `/v1/admin`
3. Click on **📝 FAQ Editor** button
4. Edit the match rules
5. Click **Save Changes**

### Match Rules Format

The match rules are stored as JSON array with objects containing:

```json
[
  {
    "label": "Players:",
    "value": "4 players per match (2v2)"
  },
  {
    "label": "Rounds:",
    "value": "3 rounds total per match"
  }
]
```

- **label**: Bold text displayed on the left (e.g., "Players:")
- **value**: Description text displayed on the right

### Default Values

If no configuration exists in the database, the system uses these defaults:

- Players: 4 players per match (2v2)
- Rounds: 3 rounds total per match
- Scoring: Best of 3 rounds
- Vyrážečka: Bonus points, +10 XP per

## Implementation Files

- **Logic**: `src/logic/faqConfig.ts` - Database functions
- **Admin Page**: `src/pages/admin/faqEditor.tsx` - Editor interface
- **FAQ Page**: `src/pages/menu/faq.tsx` - Public FAQ display
- **Routes**: `src/server.tsx` - Admin routes for editing
- **Schema**: `DATABASE_SCHEMA.json` - Database schema documentation

## Admin Routes

- `GET /v1/admin/faq` - FAQ editor page
- `POST /v1/admin/faq/update` - Save FAQ changes
- `GET /v1/faq` - Public FAQ page (displays current content)

## Features

✅ **Add/Remove Rules**: Dynamically add or remove match rules  
✅ **Live Preview**: View changes in real-time  
✅ **Admin Only**: Restricted access for administrators  
✅ **Fallback**: Uses default values if database is unavailable  
✅ **Validation**: Ensures at least one rule is present  

## Future Enhancements

Potential features to add:

- Edit other FAQ sections (Coins, Levels, ELO, etc.)
- Rich text editor for formatting
- Version history/audit log
- Multi-language support
- Preview mode before publishing
