import { Context } from "hono";
import { MatchDoc } from "../logic/match";

export interface FBetPageProps {
  c: Context;
  currentUser: string | null;
  currentUserProfile: any | null;
  availableMatches:  MatchDoc[];
  playerBets: any[];
}

export function FBetPage({ c, currentUser, currentUserProfile, availableMatches, playerBets }: FBetPageProps) {
  const userCoins = currentUserProfile?.coins || 0;
  const wonBets = playerBets.filter((b: any) => b.status === 'won');
  const totalWinnings = wonBets.reduce((sum: number, b: any) => sum + b.winnings, 0);

  return (
    <div className="max-w-6xl mx-auto p-6 text-white">
      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">🎲 F Bet</h1>
        <p className="text-neutral-400">Place bets on live matches and multiply your coins!</p>
      </div>

      {/* COINS DISPLAY */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-gradient-to-br from-yellow-900 to-yellow-800 p-4 rounded-lg border border-yellow-600">
          <div className="text-neutral-300 text-sm">Your Coins</div>
          <div className="text-3xl font-bold text-yellow-300">{userCoins.toLocaleString()}</div>
        </div>
        <div className="bg-gradient-to-br from-green-900 to-green-800 p-4 rounded-lg border border-green-600">
          <div className="text-neutral-300 text-sm">Total Winnings</div>
          <div className="text-3xl font-bold text-green-300">{totalWinnings.toLocaleString()}</div>
        </div>
        <div className="bg-gradient-to-br from-blue-900 to-blue-800 p-4 rounded-lg border border-blue-600">
          <div className="text-neutral-300 text-sm">Active Bets</div>
          <div className="text-3xl font-bold text-blue-300">{playerBets.filter((b: any) => b.status === 'pending').length}</div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="grid grid-cols-3 gap-6">
        {/* LEFT: AVAILABLE MATCHES */}
        <div className="col-span-2">
          <h2 className="text-2xl font-bold mb-4">Available Matches</h2>
          {availableMatches.length === 0 ? (
            <div className="bg-neutral-800 p-8 rounded-lg text-center text-neutral-400">
              <p>No live matches available for betting right now.</p>
              <a href="/v1/lobby" className="inline-block mt-4 px-4 py-2 bg-neutral-700 hover:bg-neutral-600 rounded transition">
                Back to Lobby
              </a>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {availableMatches.map((match: any) => {
                // helper to map player id => username
                const playerName = (id: string) => {
                  const p = match.players?.find((x:any)=>x.id===id) || match.players?.find((x:any)=>x.username===id);
                  return p ? (p.username || p.id) : id;
                };

                const isPlayerInMatch = currentUserProfile && match.players && match.players.some((p:any)=> (p.id === currentUserProfile.$id || p.username === currentUserProfile.username));
                // start time fallback
                const startTs = match.startedAt ?? match.$updatedAt ?? match.$createdAt ?? new Date().toISOString();
                // betting window end = start + 5 minutes
                const bettingEnd = new Date(new Date(startTs).getTime() + 5*60*1000).toISOString();

                return (
                  <div key={match.$id} className="bg-neutral-800 border border-neutral-700 rounded-lg p-4 hover:border-neutral-600 transition">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="text-sm text-neutral-400">Match ID: {match.$id.substring(0, 8)}</div>
                        <div className="text-lg font-semibold mt-1">Players: {match.players?.map((p:any)=>p.username || p.id).join(', ')}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-neutral-400 mb-1">Status</div>
                        <div className="px-3 py-1 bg-blue-900/50 border border-blue-600 rounded text-blue-300 text-sm font-semibold">
                          {match.state === 'playing' ? '🔴 LIVE' : '🟡 WAITING'}
                        </div>
                      </div>
                    </div>

                    {/* per-round teams and scores */}
                    {match.scores?.length > 0 && (
                      <div className="mb-3">
                        <div className="text-xs text-neutral-400 mb-2">Rounds</div>
                        <div className="space-y-2">
                          {match.scores.map((s:any, idx:number) => {
                            const aNames = (s.a || []).map((id:string)=>playerName(id)).join(' & ');
                            const bNames = (s.b || []).map((id:string)=>playerName(id)).join(' & ');
                            return (
                              <div key={idx} className="p-2 bg-neutral-900 rounded flex items-center justify-between">
                                <div className="text-sm">
                                  <div className="font-semibold">Match {idx+1}</div>
                                  <div className="text-xs text-neutral-400">{aNames} vs {bNames}</div>
                                </div>
                                <div className="text-sm font-bold">
                                  <span>{s.scoreA ?? 0}</span>
                                  <span className="mx-2 text-neutral-500">:</span>
                                  <span>{s.scoreB ?? 0}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* countdown and betting form */}
                    {match.state === 'playing' ? (
                      <>
                        <div className="text-xs text-neutral-400 mb-2">Betting window ends in:</div>
                        <div id={`countdown-${match.$id}`} data-end={bettingEnd} className="mb-3 font-mono text-lg">--:--</div>

                        <form method="post" action="/v1/bet/place" className="mt-2 p-3 bg-neutral-900 rounded-lg border border-neutral-700">
                          <input type="hidden" name="matchId" value={match.$id} />

                          <div className="grid grid-cols-3 gap-3 mb-4">
                            {[1,2,3].map((n)=>(
                              <div key={n}>
                                <label className="block text-xs text-neutral-400 mb-1">Match {n}</label>
                                <div className="flex gap-1 items-center">
                                  <label className={`flex-1 px-2 py-2 rounded text-xs ${isPlayerInMatch ? 'opacity-50 pointer-events-none' : 'bg-neutral-700 hover:bg-neutral-600'}`}>
                                    <input type="radio" name={`match${n}`} value="a" className="mr-2" disabled={isPlayerInMatch} />
                                    A
                                  </label>
                                  <label className={`flex-1 px-2 py-2 rounded text-xs ${isPlayerInMatch ? 'opacity-50 pointer-events-none' : 'bg-neutral-700 hover:bg-neutral-600'}`}>
                                    <input type="radio" name={`match${n}`} value="b" className="mr-2" disabled={isPlayerInMatch} />
                                    B
                                  </label>
                                </div>
                                <div className="text-xs text-neutral-400 mt-1">Team A: {(match.scores?.[n-1]?.a || []).map((id:string)=>playerName(id)).join(', ') || '-'}</div>
                                <div className="text-xs text-neutral-400">Team B: {(match.scores?.[n-1]?.b || []).map((id:string)=>playerName(id)).join(', ') || '-'}</div>
                              </div>
                            ))}
                          </div>

                          <div className="grid grid-cols-2 gap-3 mb-4">
                            <div>
                              <label className="block text-xs text-neutral-400 mb-1">Bet Amount</label>
                              <input type="number" name="betAmount" min="1" max={userCoins} defaultValue="100" className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded text-white text-sm" required disabled={isPlayerInMatch} />
                            </div>
                            <div>
                              <label className="block text-xs text-neutral-400 mb-1">Multiplier</label>
                              <select name="numMatches" defaultValue="1" className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded text-white text-sm" required disabled={isPlayerInMatch}>
                                <option value="1">1 Match (×2)</option>
                                <option value="2">2 Matches (×4)</option>
                                <option value="3">3 Matches (×8)</option>
                              </select>
                            </div>
                          </div>

                          <button type="submit" className="w-full py-2 bg-blue-600 hover:bg-blue-500 rounded font-semibold text-sm transition" disabled={isPlayerInMatch}>
                            🎲 Place Bet
                          </button>
                        </form>

                        {/* All bets for this match */}
                        <div className="mt-3">
                          <div className="text-sm text-neutral-400 mb-2">All bets for this match</div>
                          <div className="space-y-2">
                            {(match.bets || []).map((b:any)=>(
                              <div key={b.$id} className="p-2 bg-neutral-900 rounded flex justify-between text-sm">
                                <div>
                                  <div className="font-semibold">{b.username}</div>
                                  <div className="text-xs text-neutral-400">Bet: {b.betAmount} • {b.numMatches}×</div>
                                  <div className="text-xs text-neutral-400">Pred: {Object.entries(b.predictions || {}).map(([k,v])=>`${k.split('match')[1]}:${v}`).join(', ')}</div>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm font-bold">{b.status === 'pending' ? `${b.correctPredictions}/${b.numMatches}` : (b.status === 'won' ? `+${b.winnings}` : 'LOST')}</div>
                                  <div className="text-xs text-neutral-400">{new Date(b.$createdAt || '').toLocaleString()}</div>
                                </div>
                              </div>
                            ))}
                            {(!match.bets || match.bets.length===0) && <div className="text-xs text-neutral-400">No bets yet</div>}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-sm text-neutral-400 italic">Match will be available for betting once it starts playing.</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT: BET HISTORY */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Your Bets</h2>
          <div className="flex flex-col gap-3 max-h-96 overflow-y-auto">
            {playerBets.length === 0 ? (
              <div className="bg-neutral-800 p-4 rounded-lg text-center text-neutral-400 text-sm">
                No bets placed yet
              </div>
            ) : (
              playerBets.map((bet: any) => (
                <div
                  key={bet.$id}
                  className={`p-3 rounded-lg border text-sm ${
                    bet.status === 'won'
                      ? 'bg-green-900/30 border-green-600'
                      : bet.status === 'lost'
                      ? 'bg-red-900/30 border-red-600'
                      : 'bg-blue-900/30 border-blue-600'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-semibold">
                      {bet.numMatches}✕ Bet • {bet.betAmount} coins
                    </span>
                    <span
                      className={`text-xs font-bold px-2 py-1 rounded ${
                        bet.status === 'won'
                          ? 'bg-green-600 text-green-100'
                          : bet.status === 'lost'
                          ? 'bg-red-600 text-red-100'
                          : 'bg-blue-600 text-blue-100'
                      }`}
                    >
                      {bet.status === 'pending'
                        ? `${bet.correctPredictions}/${bet.numMatches}`
                        : bet.status === 'won'
                        ? `+${bet.winnings}`
                        : 'LOST'}
                    </span>
                  </div>
                  <div className="text-xs text-neutral-400">
                    ID: {bet.matchId.substring(0, 8)}...
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* BACK BUTTON */}
      <div className="mt-8">
        <a href="/v1/lobby" className="inline-block px-6 py-3 bg-neutral-700 hover:bg-neutral-600 rounded-lg font-semibold transition">
          ← Back to Lobby
        </a>
      </div>

      {/* simple countdown script that updates all countdown-* divs */}
      <script dangerouslySetInnerHTML={{
        __html: `
          function startCountdown(el) {
            const end = new Date(el.getAttribute('data-end')).getTime();
            function tick(){
              const now = Date.now();
              const diff = Math.max(0, end - now);
              const mins = Math.floor(diff/60000);
              const secs = Math.floor((diff%60000)/1000).toString().padStart(2,'0');
              el.textContent = (mins>0?mins+':':'') + secs;
              if (diff<=0) {
                el.textContent = '00:00';
                // disable any form elements inside parent container
                const parent = el.closest('.bg-neutral-800');
                if (parent) {
                  parent.querySelectorAll('input,select,button').forEach(i=>i.disabled = true);
                }
                clearInterval(interval);
              }
            }
            tick();
            const interval = setInterval(tick, 1000);
          }
          document.querySelectorAll('[id^="countdown-"]').forEach(el=>startCountdown(el));
        `
      }} />

      {/* radio toggle script: click selected radio again to unselect */}
      <script dangerouslySetInnerHTML={{
        __html: `
          document.querySelectorAll('input[type="radio"]').forEach(function(radio){
            radio.addEventListener('mousedown', function(){ this.dataset.wasChecked = this.checked ? 'true' : 'false'; });
            radio.addEventListener('click', function(){
              if (this.dataset.wasChecked === 'true') {
                // previously checked -> uncheck on click
                this.checked = false;
                this.dataset.wasChecked = 'false';
              } else {
                // ensure other radios in same group reset their flag
                const group = document.getElementsByName(this.name);
                group.forEach(g => { g.dataset.wasChecked = g.checked ? 'true' : 'false'; });
                this.dataset.wasChecked = this.checked ? 'true' : 'false';
              }
            });
          });
        `
      }} />
    </div>
  );
}
