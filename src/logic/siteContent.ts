// filepath: c:\Users\mrave\Desktop\master-f-tool\src\logic\siteContent.ts
const sdk = require('node-appwrite');

export interface SiteContent {
  $id: string;
  key: string;
  content: string;
  updatedAt?: string;
}

export interface ContentSection {
  key: string;
  label: string;
  description: string;
  contentType: 'json_rules' | 'text' | 'html' | 'json';
  icon?: string;
}

export interface MatchRule {
  label: string;
  value: string;
}

export async function getSiteContent(key: string): Promise<SiteContent | null> {
  const endpoint = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
  const projectId = process.env.APPWRITE_PROJECT;
  const apiKey = process.env.APPWRITE_KEY;
  const databaseId = process.env.APPWRITE_DATABASE_ID;

  if (!projectId || !apiKey || !databaseId) {
    console.error('Appwrite not configured for site content');
    return null;
  }

  const client = new sdk.Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);

  const databases = new sdk.Databases(client);

  try {
    const response = await databases.listDocuments(
      databaseId,
      'site_content',
      [sdk.Query.equal('key', key), sdk.Query.limit(1)]
    );

    if (response.documents.length > 0) {
      return response.documents[0] as SiteContent;
    }

    return null;
  } catch (error: any) {
    console.error('getSiteContent error:', error);
    return null;
  }
}

export async function updateSiteContent(key: string, content: string): Promise<SiteContent> {
  const endpoint = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
  const projectId = process.env.APPWRITE_PROJECT;
  const apiKey = process.env.APPWRITE_KEY;
  const databaseId = process.env.APPWRITE_DATABASE_ID;

  if (!projectId || !apiKey || !databaseId) {
    throw new Error('Appwrite not configured for site content');
  }

  const client = new sdk.Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);

  const databases = new sdk.Databases(client);

  try {
    // Try to find existing config
    const existing = await getSiteContent(key);

    if (existing) {
      // Update existing
      const updated = await databases.updateDocument(
        databaseId,
        'site_content',
        existing.$id,
        {
          content,
          updatedAt: new Date().toISOString(),
        }
      );
      return updated as SiteContent;
    } else {
      // Create new
      const created = await databases.createDocument(
        databaseId,
        'site_content',
        'unique()',
        {
          key,
          content,
          updatedAt: new Date().toISOString(),
        }
      );
      return created as SiteContent;
    }
  } catch (error: any) {
    console.error('updateSiteContent error:', error);
    throw error;
  }
}

export async function getAllSiteContent(): Promise<SiteContent[]> {
  const endpoint = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
  const projectId = process.env.APPWRITE_PROJECT;
  const apiKey = process.env.APPWRITE_KEY;
  const databaseId = process.env.APPWRITE_DATABASE_ID;

  if (!projectId || !apiKey || !databaseId) {
    console.error('Appwrite not configured for site content');
    return [];
  }

  const client = new sdk.Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);

  const databases = new sdk.Databases(client);

  try {
    const response = await databases.listDocuments(
      databaseId,
      'site_content',
      [sdk.Query.limit(100)]
    );

    return response.documents as SiteContent[];
  } catch (error: any) {
    console.error('getAllSiteContent error:', error);
    return [];
  }
}

// Default match rules (fallback when database is empty)
export const DEFAULT_MATCH_RULES: MatchRule[] = [
  { label: "Players:", value: "4 players per match (2v2)" },
  { label: "Rounds:", value: "3 rounds total per match" },
  { label: "Scoring:", value: "Best of 3 rounds" },
  { label: "Vyrážečka:", value: "Bonus points, +10 XP per" },
];

// Registry of all editable content sections
export const CONTENT_SECTIONS: ContentSection[] = [
  {
    key: 'match_rules',
    label: 'FAQ - Match Rules',
    description: 'Edit the match rules displayed in the FAQ page',
    contentType: 'json_rules',
    icon: '⚔️',
  },
  {
    key: 'homepage_welcome',
    label: 'Homepage - Welcome Text',
    description: 'Edit the welcome message on the homepage',
    contentType: 'text',
    icon: '🏠',
  },
  {
    key: 'lobby_announcement',
    label: 'Lobby - Announcement Banner',
    description: 'Edit the announcement banner shown in the lobby',
    contentType: 'text',
    icon: '📢',
  },
  {
    key: 'tournament_rules',
    label: 'Tournament - Rules & Guidelines',
    description: 'Edit tournament rules and participation guidelines',
    contentType: 'text',
    icon: '🏆',
  },
  {
    key: 'betting_disclaimer',
    label: 'F-Bet - Disclaimer Text',
    description: 'Edit the betting disclaimer and rules',
    contentType: 'text',
    icon: '🎲',
  },
];

// Get section metadata by key
export function getContentSection(key: string): ContentSection | undefined {
  return CONTENT_SECTIONS.find(section => section.key === key);
}

// Parse match rules from string content
export function parseMatchRules(content: string): MatchRule[] {
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return DEFAULT_MATCH_RULES;
  } catch {
    return DEFAULT_MATCH_RULES;
  }
}

// Serialize match rules to string
export function serializeMatchRules(rules: MatchRule[]): string {
  return JSON.stringify(rules, null, 2);
}

// Parse generic text content
export function parseTextContent(content: string, defaultValue: string = ''): string {
  try {
    return content || defaultValue;
  } catch {
    return defaultValue;
  }
}

// Get default content for a section
export function getDefaultContent(key: string): string {
  switch (key) {
    case 'match_rules':
      return serializeMatchRules(DEFAULT_MATCH_RULES);
    case 'homepage_welcome':
      return 'Welcome to Mars Empire - The ultimate foosball tournament platform!';
    case 'lobby_announcement':
      return 'No active announcements';
    case 'tournament_rules':
      return 'Tournament rules will be announced soon.';
    case 'betting_disclaimer':
      return 'Betting is for entertainment purposes only. Play responsibly.';
    default:
      return '';
  }
}
