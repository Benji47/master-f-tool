export function ChangesLogPage({ changes }: { changes: { date: string; updates: string[] }[] }) {
  return (
    <div class="p-6 max-w-2xl mx-auto text-white">
      <h1 class="text-3xl font-bold mb-6">Changes Log</h1>

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
