# Content Manager Setup Guide

## Overview

The Content Manager is a generic system for editing any text content across your Mars Empire site from an admin panel. It supports multiple content types and makes it easy to add new editable sections without code changes.

## Features

- **Generic Content Management**: Edit any text section site-wide
- **Multiple Content Types**: Support for structured rules (JSON), plain text, HTML, and custom JSON
- **Admin Dashboard**: Browse all editable sections in one place
- **Type-Specific Editors**: Different UI for different content types
- **Default Fallbacks**: Hardcoded defaults when database is empty
- **Easy Extension**: Add new sections by updating a registry

## Database Setup

### 1. Create Collection in Appwrite

1. Log into your Appwrite console
2. Navigate to your database (use the ID from `APPWRITE_DATABASE_ID` env variable)
3. Create a new collection:
   - **Collection ID**: `site_content`
   - **Name**: Site Content Configuration

### 2. Add Attributes

Add these three attributes to the collection:

| Attribute | Type | Size | Required | Array | Default |
|-----------|------|------|----------|-------|---------|
| `key` | String | 256 | Yes | No | null |
| `content` | String | 10000 | Yes | No | null |
| `updatedAt` | DateTime | - | No | No | null |

**Field Descriptions:**
- `key`: Unique identifier for the content section (e.g., "match_rules", "homepage_welcome")
- `content`: The actual content - JSON string for rules, plain text for announcements
- `updatedAt`: Automatic timestamp when content was last modified

### 3. Add Index

Create a unique index on the `key` attribute:
- **Index Type**: Unique
- **Attribute**: key
- **Index Key**: key_unique

### 4. Set Permissions

Configure collection permissions:
- **Read**: Any (or specific roles if needed)
- **Create/Update/Delete**: Admins only

## Content Sections Registry

All editable content sections are defined in `src/logic/siteContent.ts` in the `CONTENT_SECTIONS` array:

```typescript
export const CONTENT_SECTIONS: ContentSection[] = [
  {
    key: 'match_rules',
    label: 'FAQ - Match Rules',
    description: 'Edit the match rules displayed on the FAQ page',
    contentType: 'json_rules',
    icon: '📜',
  },
  {
    key: 'homepage_welcome',
    label: 'Homepage - Welcome Text',
    description: 'Main welcome message on the homepage',
    contentType: 'text',
    icon: '🏠',
  },
  {
    key: 'lobby_announcement',
    label: 'Lobby - Announcement Banner',
    description: 'Important announcements shown in the lobby',
    contentType: 'text',
    icon: '📢',
  },
  {
    key: 'tournament_rules',
    label: 'Tournament - Rules & Guidelines',
    description: 'Tournament participation rules',
    contentType: 'text',
    icon: '🏆',
  },
  {
    key: 'betting_disclaimer',
    label: 'F-Bet - Disclaimer Text',
    description: 'Legal disclaimer for betting feature',
    contentType: 'text',
    icon: '💰',
  },
];
```

## Content Types

### `json_rules`
Structured data for rules with titles and descriptions.
- **Storage**: JSON array serialized as string
- **UI**: Dynamic form with add/remove buttons
- **Example**: Match rules on FAQ page

```typescript
interface MatchRule {
  title: string;
  description: string;
}
```

### `text`
Plain text content.
- **Storage**: Raw text string
- **UI**: Textarea input
- **Example**: Welcome messages, announcements

### `html` (future)
Rich HTML content.
- **Storage**: HTML string
- **UI**: WYSIWYG editor (not yet implemented)

### `json` (future)
Custom JSON structures.
- **Storage**: JSON string
- **UI**: JSON editor (not yet implemented)

## Adding New Content Sections

### Step 1: Add to Registry

Edit `src/logic/siteContent.ts` and add your section to `CONTENT_SECTIONS`:

```typescript
{
  key: 'about_mission',
  label: 'About Page - Mission Statement',
  description: 'Edit the mission statement on the about page',
  contentType: 'text',
  icon: '🎯',
}
```

### Step 2: Add Default Content

In the same file, update `getDefaultContent()` function:

```typescript
function getDefaultContent(key: string): string {
  switch (key) {
    case 'match_rules':
      return JSON.stringify(DEFAULT_MATCH_RULES);
    case 'homepage_welcome':
      return 'Welcome to Mars Empire!';
    case 'lobby_announcement':
      return 'Season 1 is now live!';
    case 'tournament_rules':
      return 'Tournament rules and guidelines...';
    case 'betting_disclaimer':
      return 'Betting is for entertainment only...';
    case 'about_mission':  // Add your new section here
      return 'Our mission is to revolutionize foosball...';
    default:
      return '';
  }
}
```

### Step 3: Use in Your Page

In any page component, fetch and use the content:

```typescript
import { getSiteContent } from '../logic/siteContent';

// In your async page component:
const config = await getSiteContent('about_mission');
const missionText = config?.content || getDefaultContent('about_mission');

// Render:
<p className="text-white">{missionText}</p>
```

**That's it!** No route changes or new files needed. The content will automatically appear in the admin dashboard.

## Admin Access

### Accessing the Content Manager

1. Navigate to `/v1/admin` (password reset page)
2. Click **"Content Manager"** button
3. Or go directly to `/v1/admin/content`

### Dashboard Features

- **Section Grid**: All content sections in a card layout
- **Status Indicators**: 
  - 🟢 Green = Content configured in database
  - 🟡 Yellow = Using default hardcoded content
- **Last Updated**: Timestamp of last modification
- **Quick Edit**: Click any card to edit that section

### Editing Content

1. Click a section card from the dashboard
2. Edit using the type-specific editor:
   - **Rules**: Add/remove rules with title + description
   - **Text**: Use textarea for plain text
3. Click **"Save Changes"**
4. Changes take effect immediately

## Routes Reference

### Admin Routes
- `GET /v1/admin/content` - Content manager dashboard
- `GET /v1/admin/content/:sectionKey` - Edit specific section
- `POST /v1/admin/content/:sectionKey/update` - Save section changes

### Legacy Routes (Backward Compatible)
- `GET /v1/admin/faq` - Redirects to `/v1/admin/content?section=match_rules`
- `POST /v1/admin/faq/update` - Redirects to `/v1/admin/content/match_rules/update`

### Public Routes
- `GET /v1/faq` - FAQ page using `match_rules` content

## File Structure

```
src/
├── logic/
│   └── siteContent.ts          # Core logic & registry
├── pages/
│   └── admin/
│       ├── contentManager.tsx  # Dashboard
│       ├── contentEditor.tsx   # Generic editor
│       └── passwordReset.tsx   # Admin panel home
└── server.tsx                  # Routes
```

## TypeScript Interfaces

```typescript
interface SiteContent {
  $id: string;
  key: string;
  content: string;
  updatedAt: string;
}

interface ContentSection {
  key: string;
  label: string;
  description: string;
  contentType: 'json_rules' | 'text' | 'html' | 'json';
  icon?: string;
}

interface MatchRule {
  title: string;
  description: string;
}
```

## Functions API

### Core Functions

```typescript
// Get content for a specific section
getSiteContent(key: string): Promise<SiteContent | null>

// Update content for a section
updateSiteContent(key: string, content: string): Promise<SiteContent>

// Get all content sections
getAllSiteContent(): Promise<SiteContent[]>

// Get section metadata from registry
getContentSection(key: string): ContentSection | undefined

// Get default content for a section
getDefaultContent(key: string): string
```

### Parser Functions

```typescript
// Parse JSON rules from storage
parseMatchRules(content: string): MatchRule[]

// Parse plain text content
parseTextContent(content: string): string

// Serialize rules for storage
serializeMatchRules(rules: MatchRule[]): string
```

## Best Practices

1. **Always Define Defaults**: Every section in the registry should have a default in `getDefaultContent()`
2. **Use Type-Safe Keys**: Consider creating a union type for valid keys
3. **Version Long Content**: For major changes, consider keeping old versions in database
4. **Validate Input**: Add validation before saving (length, format, etc.)
5. **Cache in Production**: Consider caching content to reduce database reads
6. **Audit Trail**: The `updatedAt` field tracks changes; consider adding `updatedBy`

## Troubleshooting

### Content Not Showing
1. Check if database collection exists with correct name (`site_content`)
2. Verify environment variables are set (`APPWRITE_ENDPOINT`, `APPWRITE_PROJECT`, etc.)
3. Check browser console for errors
4. Verify admin authentication is working

### Editor Not Saving
1. Check Appwrite permissions on the collection
2. Verify admin user has write access
3. Check network tab for failed requests
3. Look for error messages in server logs

### Wrong Editor Type
1. Verify `contentType` in `CONTENT_SECTIONS` matches content format
2. Check if section key matches between registry and usage
3. Ensure default content matches the type

## Security Notes

- Only users passing `isAdminUsername()` check can access admin routes
- Content is stored as plain text - don't store sensitive data
- Validate and sanitize content before rendering on public pages
- Consider rate limiting on update endpoints
- Audit `updatedAt` field for unauthorized changes

## Future Enhancements

Potential improvements:
- [ ] HTML/rich text editor for 'html' content type
- [ ] JSON schema validation for 'json' content type
- [ ] Content versioning and rollback
- [ ] Multi-language support
- [ ] Content preview before saving
- [ ] Bulk import/export
- [ ] Change history/audit log
- [ ] Permission groups for different admin levels

## Examples

### Example 1: Adding a Seasonal Banner

```typescript
// 1. Add to CONTENT_SECTIONS in siteContent.ts
{
  key: 'seasonal_banner',
  label: 'Seasonal Banner',
  description: 'Holiday or event-specific banner text',
  contentType: 'text',
  icon: '🎉',
}

// 2. Add default in getDefaultContent()
case 'seasonal_banner':
  return '';  // Empty by default

// 3. Use in lobby.tsx
const banner = await getSiteContent('seasonal_banner');
if (banner?.content) {
  return (
    <div className="bg-yellow-600 text-white p-4 text-center">
      {banner.content}
    </div>
  );
}
```

### Example 2: Tournament Rules with Structure

```typescript
// Define custom interface (optional)
interface TournamentRule {
  title: string;
  description: string;
  penalty?: string;
}

// Add section with json_rules type
{
  key: 'tournament_rules_structured',
  label: 'Tournament Rules (Structured)',
  description: 'Structured tournament rules with penalties',
  contentType: 'json_rules',
  icon: '⚖️',
}

// Use in tournament page
const rulesConfig = await getSiteContent('tournament_rules_structured');
const rules: TournamentRule[] = rulesConfig 
  ? JSON.parse(rulesConfig.content)
  : [];

return (
  <div>
    {rules.map((rule, i) => (
      <div key={i}>
        <h3>{rule.title}</h3>
        <p>{rule.description}</p>
        {rule.penalty && <span className="text-red-500">{rule.penalty}</span>}
      </div>
    ))}
  </div>
);
```

## Support

For issues or questions:
1. Check this documentation
2. Review `src/logic/siteContent.ts` for implementation details
3. Inspect browser console and server logs
4. Verify Appwrite collection setup matches schema

---

**Last Updated**: 2024
**Version**: 1.0.0
