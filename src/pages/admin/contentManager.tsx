import { Context } from "hono";
import { ContentSection, SiteContent } from "../../logic/siteContent";

export function AdminContentManagerPage({
  c,
  adminUsername,
  sections,
  existingContent,
}: {
  c: Context;
  adminUsername: string;
  sections: ContentSection[];
  existingContent: SiteContent[];
}) {
  // Create a map of existing content by key
  const contentMap = new Map<string, SiteContent>();
  existingContent.forEach((content) => {
    contentMap.set(content.key, content);
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-purple-950 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white font-[Orbitron] mb-2">Content Manager</h1>
            <p className="text-neutral-400">Logged as {adminUsername}. Edit website content sections.</p>
          </div>
          <a href="/v1/admin" className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-white rounded-md transition-colors">
            ← Back to Admin Panel
          </a>
        </div>

        {/* Content Sections Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {sections.map((section) => {
            const existing = contentMap.get(section.key);
            const lastUpdated = existing?.updatedAt 
              ? new Date(existing.updatedAt).toLocaleDateString()
              : 'Never';

            return (
              <a
                key={section.key}
                href={`/v1/admin/content/${section.key}`}
                className="bg-neutral-900/60 border border-neutral-800 hover:border-purple-600 rounded-lg p-5 shadow-lg transition-all hover:shadow-purple-600/20"
              >
                <div className="flex items-start gap-4">
                  <div className="text-4xl">{section.icon}</div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-white mb-1">{section.label}</h3>
                    <p className="text-sm text-neutral-400 mb-2">{section.description}</p>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded ${
                        existing ? 'bg-green-900/30 text-green-400' : 'bg-neutral-800 text-neutral-500'
                      }`}>
                        {existing ? 'Configured' : 'Using defaults'}
                      </span>
                      <span className="text-xs text-neutral-500">
                        Last updated: {lastUpdated}
                      </span>
                    </div>
                  </div>
                  <div className="text-neutral-500">
                    →
                  </div>
                </div>
              </a>
            );
          })}
        </div>

        {/* Instructions */}
        <div className="bg-neutral-900/40 border border-neutral-700 rounded-lg p-4">
          <h3 className="text-lg font-bold text-white mb-2">How to Use</h3>
          <ul className="list-disc list-inside text-neutral-300 text-sm space-y-1">
            <li>Click on any content section to edit it</li>
            <li>Changes are saved immediately when you submit</li>
            <li>Sections without configuration will use default values</li>
            <li>Different sections have different editor types (text, rules, etc.)</li>
          </ul>
        </div>

        <form action="/v1/auth/logout" method="post" className="mt-6">
          <button
            type="submit"
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-md transition-colors"
          >
            Logout
          </button>
        </form>
      </div>
    </div>
  );
}
