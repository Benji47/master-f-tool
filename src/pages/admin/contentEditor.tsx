import { Context } from "hono";
import { MatchRule, ContentSection } from "../../logic/siteContent";

export function AdminContentEditorPage({
  c,
  adminUsername,
  section,
  content,
}: {
  c: Context;
  adminUsername: string;
  section: ContentSection;
  content: any;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-purple-950 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white font-[Orbitron] mb-2">
              {section.icon} {section.label}
            </h1>
            <p className="text-neutral-400">Logged as {adminUsername}. {section.description}</p>
          </div>
          <a href="/v1/admin/content" className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-white rounded-md transition-colors">
            ← Back to Content Manager
          </a>
        </div>

        {/* Content Editor - Different UI based on content type */}
        {section.contentType === 'json_rules' && (
          <RulesEditor section={section} rules={content as MatchRule[]} />
        )}

        {section.contentType === 'text' && (
          <TextEditor section={section} text={content as string} />
        )}

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

// Rules Editor Component (for FAQ Match Rules, etc.)
function RulesEditor({ section, rules }: { section: ContentSection; rules: MatchRule[] }) {
  return (
    <div className="bg-neutral-900/60 border border-neutral-800 rounded-lg p-6 shadow-xl mb-6">
      <h2 className="text-2xl font-bold text-green-400 mb-4 font-[Orbitron]">Rules Editor</h2>
      <p className="text-neutral-400 text-sm mb-4">
        Edit the rules displayed. Each rule has a label (bold text) and a value (description).
      </p>

      <form action={`/v1/admin/content/${section.key}/update`} method="post" className="space-y-4">
        <div id="rulesContainer" className="space-y-4">
          {rules.map((rule, index) => (
            <div key={index} className="flex gap-3 items-start bg-neutral-800/40 p-3 rounded-lg">
              <div className="flex-1 space-y-2">
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Label</label>
                  <input
                    type="text"
                    name={`rule_${index}_label`}
                    value={rule.label}
                    required
                    className="w-full bg-neutral-900 border border-neutral-700 text-neutral-100 rounded-md px-3 py-2 text-sm"
                    placeholder="Label:"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Value</label>
                  <input
                    type="text"
                    name={`rule_${index}_value`}
                    value={rule.value}
                    required
                    className="w-full bg-neutral-900 border border-neutral-700 text-neutral-100 rounded-md px-3 py-2 text-sm"
                    placeholder="Description"
                  />
                </div>
              </div>
              <button
                type="button"
                onclick={`removeRule(${index})`}
                className="mt-6 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm transition-colors"
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onclick="addRule()"
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
        >
          + Add New Rule
        </button>

        <div className="flex gap-3 pt-4 border-t border-neutral-700">
          <button
            type="submit"
            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-md transition-colors"
          >
            Save Changes
          </button>
        </div>
      </form>

      <script
        dangerouslySetInnerHTML={{
          __html: `
            let ruleCounter = ${rules.length};

            function addRule() {
              const container = document.getElementById('rulesContainer');
              const newRule = document.createElement('div');
              newRule.className = 'flex gap-3 items-start bg-neutral-800/40 p-3 rounded-lg';
              newRule.innerHTML = \`
                <div class="flex-1 space-y-2">
                  <div>
                    <label class="block text-xs text-neutral-400 mb-1">Label</label>
                    <input
                      type="text"
                      name="rule_\${ruleCounter}_label"
                      required
                      class="w-full bg-neutral-900 border border-neutral-700 text-neutral-100 rounded-md px-3 py-2 text-sm"
                      placeholder="Label:"
                    />
                  </div>
                  <div>
                    <label class="block text-xs text-neutral-400 mb-1">Value</label>
                    <input
                      type="text"
                      name="rule_\${ruleCounter}_value"
                      required
                      class="w-full bg-neutral-900 border border-neutral-700 text-neutral-100 rounded-md px-3 py-2 text-sm"
                      placeholder="Description"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onclick="this.closest('.flex').remove()"
                  class="mt-6 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm transition-colors"
                >
                  Remove
                </button>
              \`;
              container.appendChild(newRule);
              ruleCounter++;
            }

            function removeRule(index) {
              const container = document.getElementById('rulesContainer');
              const rules = container.children;
              if (rules.length > 1 && rules[index]) {
                rules[index].remove();
              } else {
                alert('Must have at least one rule');
              }
            }
          `,
        }}
      />
    </div>
  );
}

// Text Editor Component (for announcements, welcome messages, etc.)
function TextEditor({ section, text }: { section: ContentSection; text: string }) {
  return (
    <div className="bg-neutral-900/60 border border-neutral-800 rounded-lg p-6 shadow-xl mb-6">
      <h2 className="text-2xl font-bold text-blue-400 mb-4 font-[Orbitron]">Text Editor</h2>
      <p className="text-neutral-400 text-sm mb-4">
        Edit the text content displayed for this section.
      </p>

      <form action={`/v1/admin/content/${section.key}/update`} method="post" className="space-y-4">
        <div>
          <label className="block text-sm text-neutral-300 mb-2">Content</label>
          <textarea
            name="content"
            rows={6}
            required
            className="w-full bg-neutral-900 border border-neutral-700 text-neutral-100 rounded-md px-3 py-2"
            placeholder="Enter your text content here..."
          >{text}</textarea>
        </div>

        <div className="flex gap-3 pt-4 border-t border-neutral-700">
          <button
            type="submit"
            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-md transition-colors"
          >
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}
