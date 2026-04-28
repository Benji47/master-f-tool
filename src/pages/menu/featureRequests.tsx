import { Context } from "hono";
import { FeatureRequest } from "../../logic/featureRequests";

export function FeatureRequestsPage({
  c, requests, currentUser, currentUserId, isAdmin, message,
}: {
  c: Context;
  requests: FeatureRequest[];
  currentUser: string;
  currentUserId: string;
  isAdmin?: boolean;
  message?: { type: 'success' | 'error'; text: string };
}) {
  const netScore = (r: FeatureRequest) => (r.upvotes || 0) - (r.downvotes || 0);
  const openRequests = requests
    .filter(r => r.status === 'open' || (r.status !== 'rejected' && !(r.isDone && r.isTested)))
    .sort((a, b) => netScore(b) - netScore(a));
  const doneRequests = requests.filter(r => r.isDone && r.isTested && r.status !== 'rejected');
  const rejectedRequests = requests.filter(r => r.status === 'rejected');

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-purple-950 p-4 sm:p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white font-[Orbitron]">Feature Requests</h1>
            <p className="text-neutral-400 text-sm mt-1">Navrhni co chces pridat do appky</p>
          </div>
          <a href="/v1/lobby" className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-sm text-white transition-colors">
            ← Lobby
          </a>
        </div>

        {message && (
          <div className={`mb-4 p-3 rounded-lg border text-sm ${
            message.type === 'success' ? 'bg-green-900/30 border-green-700 text-green-300' : 'bg-red-900/30 border-red-700 text-red-300'
          }`}>{message.text}</div>
        )}

        {/* New request form */}
        <div className="bg-neutral-900/60 border border-purple-600/40 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-bold text-purple-300 font-[Orbitron] mb-3">Novy navrh</h2>
          <form method="post" action="/v1/feature-requests/create" className="space-y-3">
            <input type="text" name="title" placeholder="Nazov (kratky popis)" required maxLength={100}
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-600 rounded text-white text-sm placeholder-neutral-500" />
            <textarea name="description" placeholder="Detaily (volitelne)" rows={3} maxLength={500}
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-600 rounded text-white text-sm placeholder-neutral-500 resize-none" />
            <button type="submit" className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white text-sm font-bold rounded transition-colors">
              Odoslat
            </button>
          </form>
        </div>

        {/* Open requests */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-white font-[Orbitron] mb-3">Otvorene ({openRequests.length})</h2>
          {openRequests.length === 0 ? (
            <p className="text-neutral-500 text-sm">Ziadne navrhy zatial.</p>
          ) : (
            <div className="space-y-3">
              {openRequests.map(req => (
                <RequestCard key={req.$id} req={req} currentUser={currentUser} currentUserId={currentUserId} isAdmin={isAdmin} />
              ))}
            </div>
          )}
        </div>

        {/* Done requests */}
        {doneRequests.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-green-400 font-[Orbitron] mb-3">Hotove ({doneRequests.length})</h2>
            <div className="space-y-3">
              {doneRequests.map(req => (
                <RequestCard key={req.$id} req={req} currentUser={currentUser} currentUserId={currentUserId} isAdmin={isAdmin} done />
              ))}
            </div>
          </div>
        )}

        {/* Rejected */}
        {rejectedRequests.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-red-400 font-[Orbitron] mb-3">Zamietnute ({rejectedRequests.length})</h2>
            <div className="space-y-3">
              {rejectedRequests.map(req => (
                <RequestCard key={req.$id} req={req} currentUser={currentUser} currentUserId={currentUserId} isAdmin={isAdmin} rejected />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function RequestCard({ req, currentUser, currentUserId, isAdmin, done, rejected }: {
  req: FeatureRequest; currentUser: string; currentUserId: string; isAdmin?: boolean; done?: boolean; rejected?: boolean;
}) {
  const isOwner = req.username === currentUser;
  const hasUpvoted = req.upvotedBy.includes(currentUserId);
  const hasDownvoted = req.downvotedBy.includes(currentUserId);
  const netScore = (req.upvotes || 0) - (req.downvotes || 0);
  const borderColor = done ? 'border-green-600/40' : rejected ? 'border-red-600/30' : 'border-neutral-700';
  const timeAgo = formatTimeAgo(req.createdAt);

  return (
    <div className={`bg-neutral-900/60 border ${borderColor} rounded-lg p-4`} id={`req-${req.$id}`}>
      <div className="flex gap-3">
        {/* Vote column */}
        {!done && !rejected ? (
          <div className="flex-shrink-0 flex flex-col items-stretch gap-1">
            <form method="post" action="/v1/feature-requests/upvote">
              <input type="hidden" name="id" value={req.$id} />
              <button type="submit" title="Upvote" className={`w-full flex items-center justify-center px-2 py-1 rounded transition-colors ${
                hasUpvoted ? 'bg-purple-600/30 text-purple-300' : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white'
              }`}>
                <span className="text-lg">&#9650;</span>
              </button>
            </form>
            <div className={`text-center text-sm font-bold ${
              netScore > 0 ? 'text-purple-300' : netScore < 0 ? 'text-red-300' : 'text-neutral-400'
            }`}>{netScore}</div>
            <form method="post" action="/v1/feature-requests/downvote">
              <input type="hidden" name="id" value={req.$id} />
              <button type="submit" title="Downvote" className={`w-full flex items-center justify-center px-2 py-1 rounded transition-colors ${
                hasDownvoted ? 'bg-red-600/30 text-red-300' : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white'
              }`}>
                <span className="text-lg">&#9660;</span>
              </button>
            </form>
            <div className="text-[10px] text-neutral-500 text-center">{req.upvotes}↑ {req.downvotes}↓</div>
          </div>
        ) : (
          <div className="flex-shrink-0 flex flex-col items-center px-2 py-1 text-neutral-500">
            <span className="text-lg">&#9650;</span>
            <span className="text-sm font-bold">{netScore}</span>
            <span className="text-[10px]">{req.upvotes}↑ {req.downvotes}↓</span>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className={`font-bold ${done ? 'text-green-300 line-through' : rejected ? 'text-red-300 line-through' : 'text-white'}`}>{req.title}</h3>
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Done / Tested checkboxes */}
              {!rejected && (
                <>
                  <form method="post" action="/v1/feature-requests/toggle" className="inline">
                    <input type="hidden" name="id" value={req.$id} />
                    <input type="hidden" name="flag" value="isDone" />
                    <button type="submit" title="Done" className={`w-5 h-5 rounded border text-xs flex items-center justify-center transition-colors ${
                      req.isDone ? 'bg-green-600 border-green-500 text-white' : 'bg-neutral-800 border-neutral-600 text-neutral-500 hover:border-green-500'
                    }`}>{req.isDone ? '✓' : ''}</button>
                  </form>
                  <span className="text-[10px] text-neutral-500">D</span>
                  <form method="post" action="/v1/feature-requests/toggle" className="inline">
                    <input type="hidden" name="id" value={req.$id} />
                    <input type="hidden" name="flag" value="isTested" />
                    <button type="submit" title="Tested" className={`w-5 h-5 rounded border text-xs flex items-center justify-center transition-colors ${
                      req.isTested ? 'bg-blue-600 border-blue-500 text-white' : 'bg-neutral-800 border-neutral-600 text-neutral-500 hover:border-blue-500'
                    }`}>{req.isTested ? '✓' : ''}</button>
                  </form>
                  <span className="text-[10px] text-neutral-500">T</span>
                </>
              )}
              <span className="text-xs text-neutral-500">{timeAgo}</span>
            </div>
          </div>
          {req.description && (
            <p className="text-neutral-400 text-sm mt-1 whitespace-pre-wrap">{req.description}</p>
          )}
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs text-neutral-500">od {req.username}</span>

            {/* Owner actions */}
            {isOwner && !done && !rejected && (
              <button type="button" className="text-xs text-blue-400 hover:text-blue-300"
                onclick={`document.getElementById('edit-${req.$id}')?.showModal()`}>Upravit</button>
            )}

            {/* Delete — anyone can drop a shit request */}
            <form method="post" action="/v1/feature-requests/delete" className="inline" onsubmit="return confirm('Naozaj vymazat?')">
              <input type="hidden" name="id" value={req.$id} />
              <button type="submit" className="text-xs text-red-400 hover:text-red-300">Vymazat</button>
            </form>

            {/* Admin actions */}
            {isAdmin && !rejected && (
              <form method="post" action="/v1/feature-requests/status" className="inline">
                <input type="hidden" name="id" value={req.$id} />
                <input type="hidden" name="status" value="rejected" />
                <button type="submit" className="text-xs text-red-400 hover:text-red-300">Zamietnut</button>
              </form>
            )}
            {isAdmin && (done || rejected) && (
              <form method="post" action="/v1/feature-requests/status" className="inline">
                <input type="hidden" name="id" value={req.$id} />
                <input type="hidden" name="status" value="open" />
                <button type="submit" className="text-xs text-yellow-400 hover:text-yellow-300">Znovu otvorit</button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Edit dialog */}
      {isOwner && !done && !rejected && (
        <dialog id={`edit-${req.$id}`} onclick="if (event.target === this) this.close()"
          className="backdrop:bg-black/60 rounded-lg bg-neutral-900/95 border border-purple-600/50 p-0 w-full max-w-md">
          <div className="p-4">
            <h3 className="text-lg font-bold text-white font-[Orbitron] mb-3">Upravit navrh</h3>
            <form method="post" action="/v1/feature-requests/update" className="space-y-3">
              <input type="hidden" name="id" value={req.$id} />
              <input type="text" name="title" defaultValue={req.title} required maxLength={100}
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-600 rounded text-white text-sm" />
              <textarea name="description" defaultValue={req.description} rows={3} maxLength={500}
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-600 rounded text-white text-sm resize-none" />
              <div className="flex gap-2">
                <button type="submit" className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold rounded">Ulozit</button>
                <button type="button" className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-white text-sm rounded"
                  onclick={`document.getElementById('edit-${req.$id}')?.close()`}>Zrusit</button>
              </div>
            </form>
          </div>
        </dialog>
      )}
    </div>
  );
}

function formatTimeAgo(dateStr: string): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}
