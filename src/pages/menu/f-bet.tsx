import { Context } from "hono";
import { MatchDoc } from "../../logic/match";
import { formatCoins } from "../../logic/format";

export interface FBetPageProps {
  c: Context;
  currentUser: string | null;
  currentUserProfile: any | null;
  availableMatches:  MatchDoc[];
  playerBets: any[];
  allBetsHistory: any[];
  matchTeamInfoByMatchId: Record<string, { match1?: { a: string[]; b: string[] }; match2?: { a: string[]; b: string[] }; match3?: { a: string[]; b: string[] } }>;
}

type PredictionLine =
  | {
      type: "match";
      matchNo: number;
      teamA: string;
      teamB: string;
      pickedSide: "a" | "b";
      oddsLabel: string;
    }
  | {
      type: "text";
      label: string;
    };

function buildPredictionLines(
  bet: any,
  matchTeamInfoByMatchId: Record<string, { match1?: { a: string[]; b: string[] }; match2?: { a: string[]; b: string[] }; match3?: { a: string[]; b: string[] } }>
): PredictionLine[] {
  const predictions = bet?.predictions || {};
  const odds = bet?.odds || predictions?._odds || {};
  const teams = bet?.matchId ? matchTeamInfoByMatchId?.[bet.matchId] : undefined;
  const lines: PredictionLine[] = [];

  [1, 2, 3].forEach((idx) => {
    const key = `match${idx}`;
    const pick = predictions?.[key];
    if (!pick) return;
    const teamRow = teams?.[key as keyof typeof teams] as { a?: string[]; b?: string[] } | undefined;
    const teamA = (teamRow?.a || []).join(' & ') || '-';
    const teamB = (teamRow?.b || []).join(' & ') || '-';
    const pickedSide = String(pick).toLowerCase() === "b" ? "b" : "a";
    const partOdds = Number(odds?.[key] || 0);
    lines.push({
      type: "match",
      matchNo: idx,
      teamA,
      teamB,
      pickedSide,
      oddsLabel: partOdds ? `x${partOdds}` : "n/a",
    });
  });

  if (predictions?.vyrazackaOutcome) {
    const label =
      predictions.vyrazackaOutcome === 'zero' ? '0 total vyrazecky' :
      predictions.vyrazackaOutcome === 'gte1' ? '1+ total vyrazecky' :
      predictions.vyrazackaOutcome === 'gte2' ? '2+ total vyrazecky' :
      predictions.vyrazackaOutcome === 'gte3' ? '3+ total vyrazecky' :
      String(predictions.vyrazackaOutcome);
    const partOdds = Number(odds?.vyrazackaOutcome || 0);
    lines.push({ type: "text", label: `Vyrazecka: ${label} | Odds: ${partOdds ? `x${partOdds}` : 'n/a'}` });
  }

  if (Number.isFinite(Number(predictions?.totalGoals))) {
    const partOdds = Number(odds?.totalGoals || 0);
    lines.push({ type: "text", label: `Total Goals: ${Number(predictions.totalGoals)} | Odds: ${partOdds ? `x${partOdds}` : 'n/a'}` });
  }

  if (predictions?.vyrazacka?.playerCounts && typeof predictions.vyrazacka.playerCounts === 'object') {
    Object.entries(predictions.vyrazacka.playerCounts).forEach(([playerId, count]) => {
      lines.push({ type: "text", label: `Legacy Vyrazecka: ${playerId} >= ${count}` });
    });
  }

  return lines.length ? lines : [{ type: "text", label: "—" }];
}

function getSubBetResultMap(bet: any): Record<string, 'correct' | 'wrong' | 'pending'> {
  const map: Record<string, 'correct' | 'wrong' | 'pending'> = {};
  (bet?.subBetResults || []).forEach((row: any) => {
    if (row?.key && (row?.result === 'correct' || row?.result === 'wrong' || row?.result === 'pending')) {
      map[String(row.key)] = row.result;
    }
  });
  return map;
}

function SubBetMarker({ result }: { result?: 'correct' | 'wrong' | 'pending' }) {
  if (result === 'correct') return <span className="ml-2 text-emerald-300 font-bold">✓</span>;
  if (result === 'wrong') return <span className="ml-2 text-rose-300 font-bold">✕</span>;
  if (result === 'pending') return <span className="ml-2 text-amber-300 font-bold">•</span>;
  return null;
}

export function FBetPage({ c, currentUser, currentUserProfile, availableMatches, playerBets, allBetsHistory, matchTeamInfoByMatchId }: FBetPageProps) {
  const userCoins = currentUserProfile?.coins || 0;
  const wonBets = playerBets.filter((b: any) => b.status === 'won');
  const lostBets = playerBets.filter((b: any) => b.status === 'lost');
  const totalWinnings = wonBets.reduce((sum: number, b: any) => sum + b.winnings, 0);
  const totalLosings = lostBets.reduce((sum: number, b: any) => sum + Number(b.betAmount || 0), 0);

  return (
    <div className="max-w-7xl mx-auto p-6 text-white">
      {/* HEADER */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold mb-2">🎲 F Bet</h1>
          <p className="text-purple-200/70">Live match betting with match winners, vyrážečka outcomes, and exact total goals.</p>
        </div>
        <a href="/v1/lobby" className="inline-block px-5 py-2 bg-purple-700 hover:bg-purple-600 rounded-lg font-semibold transition border border-purple-500 whitespace-nowrap">
          ← Back to Lobby
        </a>
      </div>

      {/* COINS DISPLAY */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-gradient-to-br from-yellow-900/65 to-amber-900/55 p-4 rounded-lg border border-yellow-500/70">
          <div className="text-yellow-100/80 text-sm">Your Coins</div>
          <div className="text-3xl font-bold text-yellow-200">{formatCoins(userCoins)}</div>
        </div>
        <div className="bg-gradient-to-br from-green-900/65 to-emerald-900/55 p-4 rounded-lg border border-green-500/70">
          <div className="text-green-100/80 text-sm">Total Winnings</div>
          <div className="text-3xl font-bold text-emerald-300">{formatCoins(totalWinnings)}</div>
        </div>
        <div className="bg-gradient-to-br from-red-900/65 to-rose-900/55 p-4 rounded-lg border border-rose-500/70">
          <div className="text-rose-100/80 text-sm">Total Losings</div>
          <div className="text-3xl font-bold text-rose-300">{formatCoins(totalLosings)}</div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="grid grid-cols-3 gap-6 items-start">
        {/* LEFT: AVAILABLE MATCHES */}
        <div className="col-span-2">
          <h2 className="text-2xl font-bold mb-4">Available Matches</h2>
          {availableMatches.length === 0 ? (
            <div className="bg-neutral-900/70 p-8 rounded-lg text-center text-neutral-300 border border-purple-700/60">
              <p>No live matches available for betting right now.</p>
              <a href="/v1/lobby" className="inline-block mt-4 px-4 py-2 bg-purple-700 hover:bg-purple-600 rounded transition">
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

                return (
                  <div key={match.$id} className="bg-gradient-to-br from-neutral-900/90 to-purple-950/50 border border-purple-700/60 rounded-lg p-4 hover:border-purple-500/70 transition">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="text-sm text-purple-200/70">Match ID: {match.$id.substring(0, 8)}</div>
                        <div className="text-lg font-semibold mt-1">Players: {match.players?.map((p:any)=>p.username || p.id).join(', ')}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-purple-200/70 mb-1">Status</div>
                        <div className="px-3 py-1 bg-purple-900/60 border border-purple-500 rounded text-purple-200 text-sm font-semibold">
                          {match.state === 'playing' ? '🔴 LIVE' : '🟡 WAITING'}
                        </div>
                      </div>
                    </div>

                    {/* per-round teams and scores */}
                    {match.scores?.length > 0 && (
                      <div className="mb-3">
                        <div className="text-xs text-purple-200/70 mb-2">Rounds</div>
                        <div className="space-y-2">
                          {match.scores.map((s:any, idx:number) => {
                            const aNames = (s.a || []).map((id:string)=>playerName(id)).join(' & ');
                            const bNames = (s.b || []).map((id:string)=>playerName(id)).join(' & ');
                            return (
                              <div key={idx} className="p-2 bg-neutral-950/80 border border-purple-900/60 rounded flex items-center justify-between">
                                <div className="text-sm">
                                  <div className="font-semibold">Match {idx+1}</div>
                                  <div className="text-xs text-purple-200/70">{aNames} vs {bNames}</div>
                                </div>
                                <div className="text-sm font-bold">
                                  <span>{s.scoreA ?? 0}</span>
                                  <span className="mx-2 text-purple-300/60">:</span>
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
                        <form
                          method="post"
                          action="/v1/bet/place"
                          className="bet-form mt-2 p-3 bg-neutral-950/70 rounded-lg border border-purple-700/60"
                        >
                          <input type="hidden" name="matchId" value={match.$id} />

                          <div className="grid grid-cols-3 gap-3 mb-4">
                            {[1,2,3].map((n)=>(
                              <div key={n}>
                                <label className="block text-xs text-purple-200/70 mb-1">Match {n}</label>
                                <div className="flex gap-1 items-center">
                                  <label className={`flex-1 px-2 py-2 rounded text-xs border ${isPlayerInMatch ? 'opacity-50 pointer-events-none border-purple-800 bg-purple-950/40' : 'border-purple-700 bg-purple-900/40 hover:bg-purple-800/50'}`}>
                                    <input type="radio" name={`match${n}`} value="a" className="mr-2" data-odds={match.bettingOdds?.[n-1]?.a ?? ''} disabled={isPlayerInMatch} />
                                    A {match.bettingOdds?.[n-1]?.a ? `(x${match.bettingOdds[n-1].a})` : ''}
                                  </label>
                                  <label className={`flex-1 px-2 py-2 rounded text-xs border ${isPlayerInMatch ? 'opacity-50 pointer-events-none border-purple-800 bg-purple-950/40' : 'border-purple-700 bg-purple-900/40 hover:bg-purple-800/50'}`}>
                                    <input type="radio" name={`match${n}`} value="b" className="mr-2" data-odds={match.bettingOdds?.[n-1]?.b ?? ''} disabled={isPlayerInMatch} />
                                    B {match.bettingOdds?.[n-1]?.b ? `(x${match.bettingOdds[n-1].b})` : ''}
                                  </label>
                                </div>
                                <div className="text-xs text-purple-200/70 mt-1">Team A: {(match.scores?.[n-1]?.a || []).map((id:string)=>playerName(id)).join(', ') || '-'}</div>
                                <div className="text-xs text-purple-200/70">Team B: {(match.scores?.[n-1]?.b || []).map((id:string)=>playerName(id)).join(', ') || '-'}</div>
                              </div>
                            ))}
                          </div>

                          <div className="grid grid-cols-3 gap-3 mb-4">
                            <div>
                              <label className="block text-xs text-purple-200/70 mb-1">Bet Amount</label>
                              <input type="number" name="betAmount" min="1" max={userCoins} defaultValue="100" className="w-full px-3 py-2 bg-purple-950/60 border border-purple-700 rounded text-white text-sm" required disabled={isPlayerInMatch} />
                            </div>
                            <div>
                              <label className="block text-xs text-purple-200/70 mb-1">Vyrážečka Outcome</label>
                              <select name="vyrazackaOutcome" className="w-full px-3 py-2 bg-purple-950/60 border border-purple-700 rounded text-white text-sm" disabled={isPlayerInMatch}>
                                <option value="">No vyrážečka bet</option>
                                <option value="zero" data-odds={match.vyrazackaOutcomeOdds?.zero ?? ''}>0 total (x{match.vyrazackaOutcomeOdds?.zero ?? '-'})</option>
                                <option value="gte1" data-odds={match.vyrazackaOutcomeOdds?.gte1 ?? ''}>1+ total (x{match.vyrazackaOutcomeOdds?.gte1 ?? '-'})</option>
                                <option value="gte2" data-odds={match.vyrazackaOutcomeOdds?.gte2 ?? ''}>2+ total (x{match.vyrazackaOutcomeOdds?.gte2 ?? '-'})</option>
                                <option value="gte3" data-odds={match.vyrazackaOutcomeOdds?.gte3 ?? ''}>3+ total (x{match.vyrazackaOutcomeOdds?.gte3 ?? '-'})</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs text-purple-200/70 mb-1">Exact Total Goals</label>
                              <select name="totalGoals" className="w-full px-3 py-2 bg-purple-950/60 border border-purple-700 rounded text-white text-sm" disabled={isPlayerInMatch}>
                                <option value="">No goals bet</option>
                                {Array.from({ length: 28 }, (_, i) => 30 + i).map((goalTotal) => (
                                  <option key={goalTotal} value={goalTotal} data-odds={match.totalGoalsOdds?.[goalTotal] ?? ''}>
                                    {goalTotal} (x{match.totalGoalsOdds?.[goalTotal] ?? '-'})
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div className="mb-3 text-xs text-purple-100/90" data-odds-preview>
                            Current odds: x1.00 • Potential win: {formatCoins(0)}
                          </div>

                          <button type="submit" className="w-full py-2 bg-purple-600 hover:bg-purple-500 rounded font-semibold text-sm transition" disabled={isPlayerInMatch}>
                            🎲 Place Bet
                          </button>
                        </form>

                        {/* All bets for this match */}
                        <div className="mt-3">
                          <div className="text-sm text-purple-200/80 mb-2">All bets for this match</div>
                          <div className="space-y-2">
                            {(match.bets || []).map((b:any)=>(
                              <div key={b.$id} className="p-2 bg-neutral-950/80 border border-purple-900/60 rounded flex justify-between text-sm gap-4">
                                <div>
                                  <div className="font-semibold">{b.username}</div>
                                  <div className="text-xs text-purple-200/70">Bet: {formatCoins(b.betAmount)} • Legs: {b.totalLegs ?? b.numMatches} • Odds: {b.odds?.total ? `x${b.odds.total}` : 'n/a'}</div>
                                  <div className="text-xs text-purple-200/70 space-y-1">
                                    {buildPredictionLines(b, matchTeamInfoByMatchId).map((line, lineIdx) => (
                                      line.type === "match" ? (
                                        <div key={lineIdx}>
                                          <span>Match {line.matchNo}: </span>
                                          <span className={line.pickedSide === 'a' ? 'font-bold underline text-purple-100' : ''}>Team A: {line.teamA}</span>
                                          <span> | </span>
                                          <span className={line.pickedSide === 'b' ? 'font-bold underline text-purple-100' : ''}>Team B: {line.teamB}</span>
                                          <span> | Odds: {line.oddsLabel}</span>
                                        </div>
                                      ) : (
                                        <div key={lineIdx}>{line.label}</div>
                                      )
                                    ))}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm font-bold">{b.status === 'pending' ? `${b.correctPredictions}/${b.totalLegs ?? b.numMatches}` : (b.status === 'won' ? `+${formatCoins(b.winnings)}` : 'LOST')}</div>
                                  <div className="text-xs text-purple-200/60">{new Date(b.$createdAt || '').toLocaleString()}</div>
                                </div>
                              </div>
                            ))}
                            {(!match.bets || match.bets.length===0) && <div className="text-xs text-purple-200/60">No bets yet</div>}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-sm text-purple-200/70 italic">Match will be available for betting once it starts playing.</div>
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
          <div className="flex flex-col gap-3 max-h-[30rem] overflow-y-auto pr-1">
            {playerBets.length === 0 ? (
              <div className="bg-neutral-900/70 border border-purple-700/60 p-4 rounded-lg text-center text-purple-200/70 text-sm">
                No bets placed yet
              </div>
            ) : (
              playerBets.map((bet: any) => (
                (() => {
                  const subBetResultMap = getSubBetResultMap(bet);
                  return (
                <div
                  key={bet.$id}
                  className={`p-3 rounded-lg border text-sm ${
                    bet.status === 'won'
                      ? 'bg-emerald-900/25 border-emerald-600'
                      : bet.status === 'lost'
                      ? 'bg-rose-900/25 border-rose-600'
                      : 'bg-purple-900/30 border-purple-600'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-semibold">
                      {formatCoins(bet.betAmount)} coins
                    </span>
                    <span
                      className={`text-xs font-bold px-2 py-1 rounded ${
                        bet.status === 'won'
                          ? 'bg-emerald-600 text-emerald-50'
                          : bet.status === 'lost'
                          ? 'bg-rose-600 text-rose-50'
                          : 'bg-purple-600 text-purple-100'
                      }`}
                    >
                      {bet.status === 'pending'
                          ? `${bet.correctPredictions}/${bet.totalLegs ?? bet.numMatches}`
                        : bet.status === 'won'
                        ? `+${formatCoins(bet.winnings)}`
                        : 'LOST'}
                    </span>
                  </div>
                  <div className="text-xs text-purple-200/70">
                      ID: {bet.matchId.substring(0, 8)}... • Odds: {bet.odds?.total ? `x${bet.odds.total}` : 'n/a'}
                  </div>
                  <div className="text-xs text-purple-200/70 space-y-1">
                    {buildPredictionLines(bet, matchTeamInfoByMatchId).map((line, lineIdx) => (
                      line.type === "match" ? (
                        <div key={lineIdx}>
                          <span>Match {line.matchNo}: </span>
                          <span className={line.pickedSide === 'a' ? 'font-bold underline text-purple-100' : ''}>Team A: {line.teamA}</span>
                          <span> | </span>
                          <span className={line.pickedSide === 'b' ? 'font-bold underline text-purple-100' : ''}>Team B: {line.teamB}</span>
                          <span> | Odds: {line.oddsLabel}</span>
                          <SubBetMarker result={subBetResultMap[`match${line.matchNo}`]} />
                        </div>
                      ) : (
                        <div key={lineIdx}>
                          <span>{line.label}</span>
                          {line.label.startsWith('Vyrazecka:') && <SubBetMarker result={subBetResultMap['vyrazackaOutcome']} />}
                          {line.label.startsWith('Total Goals:') && <SubBetMarker result={subBetResultMap['totalGoals']} />}
                        </div>
                      )
                    ))}
                  </div>
                  <div className="text-xs text-purple-200/60">{new Date(bet.$createdAt || '').toLocaleString()}</div>
                </div>
                  );
                })()
              ))
            )}
          </div>
        </div>
      </div>

      {/* GLOBAL BET HISTORY */}
      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4">All Players Bet History</h2>
        <div className="bg-neutral-900/70 border border-purple-700/60 rounded-lg p-4 max-h-[26rem] overflow-y-auto">
          {allBetsHistory.length === 0 ? (
            <div className="text-sm text-purple-200/70">No bet history available.</div>
          ) : (
            <div className="space-y-2">
              {allBetsHistory.map((bet: any) => (
                (() => {
                  const subBetResultMap = getSubBetResultMap(bet);
                  return (
                <div key={bet.$id} className="p-3 rounded border border-purple-900/70 bg-neutral-950/70 flex justify-between gap-4 text-sm">
                  <div>
                    <div className="font-semibold text-white">{bet.username}</div>
                    <div className="text-xs text-purple-200/70">Match {String(bet.matchId || '').substring(0, 8)}... • Bet {formatCoins(bet.betAmount || 0)} • Odds {bet.odds?.total ? `x${bet.odds.total}` : 'n/a'}</div>
                    <div className="text-xs text-purple-200/70 space-y-1">
                      {buildPredictionLines(bet, matchTeamInfoByMatchId).map((line, lineIdx) => (
                        line.type === "match" ? (
                          <div key={lineIdx}>
                            <span>Match {line.matchNo}: </span>
                            <span className={line.pickedSide === 'a' ? 'font-bold underline text-purple-100' : ''}>Team A: {line.teamA}</span>
                            <span> | </span>
                            <span className={line.pickedSide === 'b' ? 'font-bold underline text-purple-100' : ''}>Team B: {line.teamB}</span>
                            <span> | Odds: {line.oddsLabel}</span>
                            <SubBetMarker result={subBetResultMap[`match${line.matchNo}`]} />
                          </div>
                        ) : (
                          <div key={lineIdx}>
                            <span>{line.label}</span>
                            {line.label.startsWith('Vyrazecka:') && <SubBetMarker result={subBetResultMap['vyrazackaOutcome']} />}
                            {line.label.startsWith('Total Goals:') && <SubBetMarker result={subBetResultMap['totalGoals']} />}
                          </div>
                        )
                      ))}
                    </div>
                    <div className="text-xs text-purple-200/60">{new Date(bet.$createdAt || '').toLocaleString()}</div>
                  </div>
                  <div className="text-right">
                    <div className={`font-bold ${bet.status === 'won' ? 'text-emerald-300' : bet.status === 'lost' ? 'text-rose-300' : 'text-indigo-200'}`}>
                      {bet.status === 'won' ? `+${formatCoins(bet.winnings || 0)}` : bet.status === 'lost' ? 'LOST' : 'PENDING'}
                    </div>
                    <div className="text-xs text-purple-200/60">Correct {bet.correctPredictions || 0}/{bet.totalLegs ?? bet.numMatches ?? 0}</div>
                  </div>
                </div>
                  );
                })()
              ))}
            </div>
          )}
        </div>
      </div>

      <script dangerouslySetInnerHTML={{
        __html: `
          function updateOddsPreview(form) {
            const preview = form.querySelector('[data-odds-preview]');
            if (!preview) return;
            const amountInput = form.querySelector('input[name="betAmount"]');
            const amount = Number(amountInput ? amountInput.value : 0) || 0;
            const matchOdds = Array.from(form.querySelectorAll('input[type="radio"]:checked'))
              .map(r => Number(r.getAttribute('data-odds')) || 1);
            let totalOdds = 1;
            let legs = 0;
            matchOdds.forEach(o => { totalOdds *= o; legs += 1; });

            const vySelect = form.querySelector('select[name="vyrazackaOutcome"]');
            if (vySelect && vySelect.value) {
              const selectedVyOption = vySelect.options[vySelect.selectedIndex];
              const vyOdds = Number(selectedVyOption?.getAttribute('data-odds')) || 1;
              totalOdds *= vyOdds;
              legs += 1;
            }

            const goalsSelect = form.querySelector('select[name="totalGoals"]');
            if (goalsSelect && goalsSelect.value) {
              const selectedGoalsOption = goalsSelect.options[goalsSelect.selectedIndex];
              const goalsOdds = Number(selectedGoalsOption?.getAttribute('data-odds')) || 1;
              totalOdds *= goalsOdds;
              legs += 1;
            }

            if (legs === 0) {
              preview.textContent = 'Current odds: x1.00 • Potential win: 0';
              return;
            }
            const payout = Math.round(amount * totalOdds);
            preview.textContent = 'Current odds: x' + totalOdds.toFixed(2) + ' • Potential win: ' + payout.toLocaleString();
          }

          function wireOddsPreview(form) {
            const inputs = form.querySelectorAll('input, select');
            inputs.forEach(el => el.addEventListener('change', function(){ updateOddsPreview(form); }));
            inputs.forEach(el => el.addEventListener('keyup', function(){ updateOddsPreview(form); }));
            updateOddsPreview(form);
          }

          function wireUncheckableMatchRadios(form) {
            const radios = form.querySelectorAll('input[type="radio"][name^="match"]');
            radios.forEach(function(radio) {
              const markWasChecked = function() {
                radio.dataset.wasChecked = radio.checked ? '1' : '0';
              };

              radio.addEventListener('pointerdown', markWasChecked);
              radio.addEventListener('mousedown', markWasChecked);

              const parentLabel = radio.closest('label');
              if (parentLabel) {
                parentLabel.addEventListener('pointerdown', markWasChecked);
                parentLabel.addEventListener('mousedown', markWasChecked);
              }

              radio.addEventListener('click', function() {
                if (this.dataset.wasChecked === '1') {
                  this.checked = false;
                  this.dataset.wasChecked = '0';
                  this.dispatchEvent(new Event('change', { bubbles: true }));
                }
              });
            });
          }

          document.querySelectorAll('.bet-form').forEach(form => {
            wireOddsPreview(form);
            wireUncheckableMatchRadios(form);
          });
        `
      }} />
    </div>
  );
}
