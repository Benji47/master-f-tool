import { Context } from "hono";

export function TournamentsPage({ c }: { c: Context }) {
  return (
    <div className="max-w-3xl mx-auto p-6 bg-neutral-900/60 rounded-lg border border-neutral-800">
      <h1 className="text-2xl font-bold mb-4">Tournaments</h1>
      <p className="text-neutral-300 mb-4">(Empty placeholder page)</p>
      <a href="/v1/lobby" className="inline-block px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded text-sm">Back to Lobby</a>
    </div>
  );
}
