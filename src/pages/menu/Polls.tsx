import { Poll } from "../../logic/polls";

export function PollsPanel({
  polls,
  currentUserId,
  totalPlayers,
  isAdmin,
}: {
  polls: Poll[];
  currentUserId: string;
  totalPlayers: number;
  isAdmin?: boolean;
}) {
  const sorted = [...polls].sort((a, b) => {
    const aVoted = currentUserId in a.votes ? 1 : 0;
    const bVoted = currentUserId in b.votes ? 1 : 0;
    if (aVoted !== bVoted) return aVoted - bVoted; // unanswered first
    return (b.createdAt || '').localeCompare(a.createdAt || '');
  });

  const unansweredCount = polls.filter(p => !p.closed && !(currentUserId in p.votes)).length;

  return (
    <div className="w-full max-w-2xl bg-neutral-900/50 rounded-lg border border-purple-600/50 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold text-white font-[Orbitron] flex items-center gap-2">
          🗳️ Hlasovania
          {unansweredCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-bold bg-yellow-500 text-black rounded-full animate-pulse">
              {unansweredCount} nove
            </span>
          )}
        </h3>
        <button
          type="button"
          onclick="document.getElementById('polls-create-modal')?.showModal()"
          className="px-3 py-1 text-xs font-semibold bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white rounded transition-colors"
        >
          + Vytvorit
        </button>
      </div>

      {sorted.length === 0 ? (
        <p className="text-neutral-500 text-sm text-center py-4">Ziadne hlasovania zatial.</p>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
          {sorted.map(poll => (
            <PollCard
              key={poll.$id}
              poll={poll}
              currentUserId={currentUserId}
              totalPlayers={totalPlayers}
              isAdmin={isAdmin}
              isOwner={poll.createdBy === currentUserId}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      <dialog
        id="polls-create-modal"
        onclick="if (event.target === this) this.close()"
        className="backdrop:bg-black/60 rounded-lg bg-neutral-900/95 border border-purple-600/50 p-0 w-full max-w-md"
      >
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-bold text-white font-[Orbitron]">Nove hlasovanie</h4>
            <button
              type="button"
              onclick="document.getElementById('polls-create-modal')?.close()"
              className="text-neutral-400 hover:text-white text-2xl leading-none"
            >×</button>
          </div>
          <form method="post" action="/v1/polls/create" className="space-y-3">
            <input
              type="text" name="question" placeholder="Otazka..." required maxLength={200}
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-600 rounded text-white text-sm placeholder-neutral-500"
            />
            <div className="space-y-2" id="poll-options-list">
              <input type="text" name="option" placeholder="Moznost 1" required maxLength={100}
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-600 rounded text-white text-sm placeholder-neutral-500" />
              <input type="text" name="option" placeholder="Moznost 2" required maxLength={100}
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-600 rounded text-white text-sm placeholder-neutral-500" />
            </div>
            <button
              type="button"
              onclick="(function(){var c=document.getElementById('poll-options-list');var inputs=c.querySelectorAll('input[name=option]');if(inputs.length>=8)return;var i=document.createElement('input');i.type='text';i.name='option';i.placeholder='Moznost '+(inputs.length+1);i.maxLength=100;i.className='w-full px-3 py-2 bg-neutral-800 border border-neutral-600 rounded text-white text-sm placeholder-neutral-500';c.appendChild(i);})()"
              className="text-xs text-purple-400 hover:text-purple-300"
            >+ pridat moznost</button>
            <div className="flex gap-2 pt-2">
              <button type="submit" className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white text-sm font-bold rounded">
                Vytvorit
              </button>
              <button
                type="button"
                onclick="document.getElementById('polls-create-modal')?.close()"
                className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-white text-sm rounded"
              >Zrusit</button>
            </div>
          </form>
        </div>
      </dialog>
    </div>
  );
}

function PollCard({
  poll, currentUserId, totalPlayers, isAdmin, isOwner,
}: {
  poll: Poll;
  currentUserId: string;
  totalPlayers: number;
  isAdmin?: boolean;
  isOwner?: boolean;
}) {
  const voterIds = Object.keys(poll.votes);
  const voteCount = voterIds.length;
  const userVote = poll.votes[currentUserId];
  const hasVoted = userVote !== undefined;
  const counts: number[] = poll.options.map((_, i) => 0);
  for (const idx of Object.values(poll.votes)) {
    if (idx >= 0 && idx < counts.length) counts[idx] += 1;
  }
  const showResults = hasVoted || poll.closed;
  const canDelete = isAdmin || isOwner;

  return (
    <div className={`rounded-lg border p-3 ${
      poll.closed ? 'bg-neutral-800/40 border-neutral-700' :
      !hasVoted ? 'bg-yellow-900/20 border-yellow-600/60 shadow-[0_0_12px_rgba(234,179,8,0.25)]' :
      'bg-neutral-800/40 border-neutral-700'
    }`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            {!hasVoted && !poll.closed && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-yellow-500 text-black rounded">NEW</span>
            )}
            {poll.closed && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-neutral-600 text-neutral-200 rounded">CLOSED</span>
            )}
            <span className="text-white font-semibold text-sm">{poll.question}</span>
          </div>
          <div className="text-[11px] text-neutral-500 mt-0.5">
            by {poll.createdByName} · {voteCount}/{totalPlayers} hlasovalo
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canDelete && (
            <button
              type="button"
              onclick={`document.getElementById('poll-edit-${poll.$id}')?.showModal()`}
              className="text-blue-400 hover:text-blue-300 text-xs"
              title="Upravit"
            >✏️</button>
          )}
          {canDelete && (
            <form method="post" action="/v1/polls/delete" onsubmit="return confirm('Zmazat hlasovanie?')">
              <input type="hidden" name="id" value={poll.$id} />
              <button type="submit" className="text-red-400 hover:text-red-300 text-xs">🗑</button>
            </form>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        {poll.options.map((opt, i) => {
          const c = counts[i];
          const pct = voteCount > 0 ? Math.round((c / voteCount) * 100) : 0;
          const isMyVote = userVote === i;
          if (showResults) {
            return (
              <div key={i} className="relative">
                <div className={`relative rounded overflow-hidden border ${isMyVote ? 'border-purple-500' : 'border-neutral-700'}`}>
                  <div
                    className={`absolute inset-y-0 left-0 ${isMyVote ? 'bg-purple-600/40' : 'bg-neutral-700/40'}`}
                    style={`width:${pct}%`}
                  ></div>
                  <div className="relative flex justify-between items-center px-2 py-1.5 text-xs">
                    <span className="text-white">
                      {isMyVote && '✓ '}{opt}
                    </span>
                    <span className="text-neutral-300 font-mono">{c} ({pct}%)</span>
                  </div>
                </div>
              </div>
            );
          }
          return (
            <form key={i} method="post" action="/v1/polls/vote">
              <input type="hidden" name="id" value={poll.$id} />
              <input type="hidden" name="optionIndex" value={String(i)} />
              <button
                type="submit"
                className="w-full text-left px-2 py-1.5 text-xs bg-neutral-700/60 hover:bg-purple-700/60 border border-neutral-600 hover:border-purple-500 rounded text-white transition-colors"
              >
                {opt}
              </button>
            </form>
          );
        })}
      </div>

      {hasVoted && !poll.closed && (
        <form method="post" action="/v1/polls/clear-vote" className="mt-2">
          <input type="hidden" name="id" value={poll.$id} />
          <button type="submit" className="text-[11px] text-neutral-400 hover:text-purple-300 underline">
            ↺ zmenit moj hlas
          </button>
        </form>
      )}

      {canDelete && (
        <dialog
          id={`poll-edit-${poll.$id}`}
          onclick="if (event.target === this) this.close()"
          className="backdrop:bg-black/60 rounded-lg bg-neutral-900/95 border border-blue-600/50 p-0 w-full max-w-md"
        >
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-bold text-white font-[Orbitron]">Upravit hlasovanie</h4>
              <button
                type="button"
                onclick={`document.getElementById('poll-edit-${poll.$id}')?.close()`}
                className="text-neutral-400 hover:text-white text-2xl leading-none"
              >×</button>
            </div>
            <p className="text-[11px] text-yellow-400 mb-3">
              ⚠️ Pri zmene moznosti sa vsetky hlasy resetuju.
            </p>
            <form method="post" action="/v1/polls/update" className="space-y-3">
              <input type="hidden" name="id" value={poll.$id} />
              <input
                type="text" name="question" value={poll.question} required maxLength={200}
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-600 rounded text-white text-sm placeholder-neutral-500"
              />
              <div className="space-y-2" id={`poll-edit-options-${poll.$id}`}>
                {poll.options.map((opt, i) => (
                  <input key={i} type="text" name="option" value={opt} required maxLength={100}
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-600 rounded text-white text-sm" />
                ))}
              </div>
              <button
                type="button"
                onclick={`(function(){var c=document.getElementById('poll-edit-options-${poll.$id}');var inputs=c.querySelectorAll('input[name=option]');if(inputs.length>=8)return;var i=document.createElement('input');i.type='text';i.name='option';i.placeholder='Moznost '+(inputs.length+1);i.maxLength=100;i.required=true;i.className='w-full px-3 py-2 bg-neutral-800 border border-neutral-600 rounded text-white text-sm';c.appendChild(i);})()`}
                className="text-xs text-blue-400 hover:text-blue-300"
              >+ pridat moznost</button>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white text-sm font-bold rounded">
                  Ulozit
                </button>
                <button
                  type="button"
                  onclick={`document.getElementById('poll-edit-${poll.$id}')?.close()`}
                  className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-white text-sm rounded"
                >Zrusit</button>
              </div>
            </form>
          </div>
        </dialog>
      )}
    </div>
  );
}
