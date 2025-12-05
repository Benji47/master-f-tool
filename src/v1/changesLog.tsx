export function ChangesLogPage({ changes }: { changes: { date: string; updates: string[] }[] }) {
  return (
    <div class="p-6 max-w-2xl mx-auto text-white">
      {/* HEADER ROW */}
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-3xl font-bold">Changes Log</h1>

        <a href="/v1/lobby">
          <button class="px-4 py-2 bg-red-500 border-red-500 text-white rounded-md hover:bg-red-600 cursor-pointer font-semibold transition-colors">
            ← Back to Lobby
          </button>
        </a>
      </div>

      <div class="space-y-6">
        {changes.map((entry) => (
          <div class="bg-neutral-800 rounded-lg p-4 shadow">
            <h2 class="text-xl font-semibold mb-2">{entry.date}</h2>

            <ul class="list-disc pl-6 space-y-1 text-neutral-300">
              {entry.updates.map((u) => (
                <li>{u}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
