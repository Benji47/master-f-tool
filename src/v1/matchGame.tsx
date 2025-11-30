import { Context } from "hono";
import "../styles/Homepage.css";

export function MatchGamePage({ c, match }: { c: Context; match: any }) {
  const players = match.players || [];
  const scores = match.scores || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-green-950 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-4 font-[Orbitron]">Match Game</h1>
        <p className="text-neutral-400 mb-4">Match ID: {match.$id}</p>

        {/* Players list */}
        <div className="bg-neutral-900/50 rounded-lg p-4 mb-6 border border-neutral-800">
          <h3 className="text-lg text-white mb-2">Players</h3>
          <div className="grid grid-cols-2 gap-2 text-sm text-neutral-200">
            {players.map((p: any) => (
              <div key={p.id} className="p-2 bg-neutral-800/40 rounded">
                <div className="font-semibold text-white">{p.username}</div>
                <div className="text-xs text-neutral-400">ELO: {p.elo} — W:{p.wins} L:{p.loses}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Pairings */}
        <div id="pairings" className="space-y-4">
          {scores.map((s: any, idx: number) => (
            <div key={idx} className="bg-neutral-900/50 rounded-lg p-4 border border-neutral-800 flex items-center justify-between">
              {/* Left team */}
              <div className="flex flex-col items-start gap-2 w-1/3">
                <div className="font-semibold text-white">
                  {s.a.map((id:string,i:number)=> {
                    const p = players.find((x:any)=>x.id===id);
                    return <span key={i}>{p ? p.username : id}{i < s.a.length-1 ? ' / ' : ''}</span>;
                  })}
                </div>
                <div className="flex gap-2">
                  <button className="px-3 py-1 bg-green-600 rounded text-sm" data-idx={idx} data-side="a" data-delta="10">+10</button>
                  <button className="px-3 py-1 bg-green-500 rounded text-sm" data-idx={idx} data-side="a" data-delta="5">+5</button>
                  <button className="px-3 py-1 bg-green-400 rounded text-sm" data-idx={idx} data-side="a" data-delta="1">+1</button>
                </div>
                <div className="flex gap-2 mt-1">
                  <button className="px-3 py-1 bg-red-600 rounded text-sm" data-idx={idx} data-side="a" data-delta="-10">-10</button>
                  <button className="px-3 py-1 bg-red-500 rounded text-sm" data-idx={idx} data-side="a" data-delta="-5">-5</button>
                  <button className="px-3 py-1 bg-red-400 rounded text-sm" data-idx={idx} data-side="a" data-delta="-1">-1</button>
                </div>
              </div>

              {/* Score center */}
              <div className="text-2xl font-bold text-white">
                <span id={`scoreA-${idx}`}>{s.scoreA}</span>
                <span className="mx-4 text-neutral-400">:</span>
                <span id={`scoreB-${idx}`}>{s.scoreB}</span>
              </div>

              {/* Right team */}
              <div className="flex flex-col items-end gap-2 w-1/3">
                <div className="font-semibold text-white">
                  {s.b.map((id:string,i:number)=> {
                    const p = players.find((x:any)=>x.id===id);
                    return <span key={i}>{p ? p.username : id}{i < s.b.length-1 ? ' / ' : ''}</span>;
                  })}
                </div>
                <div className="flex gap-2">
                  <button className="px-3 py-1 bg-green-600 rounded text-sm" data-idx={idx} data-side="b" data-delta="10">+10</button>
                  <button className="px-3 py-1 bg-green-500 rounded text-sm" data-idx={idx} data-side="b" data-delta="5">+5</button>
                  <button className="px-3 py-1 bg-green-400 rounded text-sm" data-idx={idx} data-side="b" data-delta="1">+1</button>
                </div>
                <div className="flex gap-2 mt-1">
                  <button className="px-3 py-1 bg-red-600 rounded text-sm" data-idx={idx} data-side="b" data-delta="-10">-10</button>
                  <button className="px-3 py-1 bg-red-500 rounded text-sm" data-idx={idx} data-side="b" data-delta="-5">-5</button>
                  <button className="px-3 py-1 bg-red-400 rounded text-sm" data-idx={idx} data-side="b" data-delta="-1">-1</button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex gap-3">
          <a href="/v1/match/lobby" className="flex-1">
            <button className="w-full px-6 py-2 bg-neutral-800/60 hover:bg-neutral-800 text-white rounded-md">← Back to Lobby</button>
          </a>

          <form id="finishForm" action="/v1/match/game/finish" method="post" className="flex-1">
            <input type="hidden" name="matchId" value={match.$id} />
            <button id="finishBtn" type="button" className="w-full px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md">Finish Match</button>
          </form>
        </div>
      </div>

      <script
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: `
(function(){
  const matchId = ${JSON.stringify(match.$id)};
  async function sendUpdate(idx, side, delta){
    try{
      const form = new FormData();
      form.append('matchId', matchId);
      form.append('index', String(idx));
      form.append('side', side);
      form.append('delta', String(delta));
      const res = await fetch('/v1/match/game/score', { method: 'POST', body: form });
      if(!res.ok) {
        const txt = await res.text().catch(()=>null);
        console.error('score update failed', txt);
        return;
      }
      const data = await res.json();
      // update DOM scores
      (data.scores || []).forEach((s, i) => {
        const a = document.getElementById('scoreA-'+i);
        const b = document.getElementById('scoreB-'+i);
        if(a) a.textContent = String(s.scoreA);
        if(b) b.textContent = String(s.scoreB);
      });
    }catch(e){ console.error(e); }
  }

  document.addEventListener('click', function(e){
    const el = e.target;
    if(!(el instanceof HTMLElement)) return;
    const idx = el.getAttribute('data-idx');
    const side = el.getAttribute('data-side');
    const delta = el.getAttribute('data-delta');
    if(idx && side && delta){
      // optimistic client-side clamp (server also enforces)
      const scoreEl = document.getElementById((side==='a'?'scoreA-':'scoreB-')+idx);
      let cur = scoreEl ? Number(scoreEl.textContent || '0') : 0;
      const newVal = Math.min(10, Math.max(0, cur + Number(delta)));
      // send delta = newVal - cur
      sendUpdate(Number(idx), side, newVal - cur);
    }

    // finish button
    if(el.id === 'finishBtn'){
      if(!confirm('Are you sure you want to finish the match and apply results? This is irreversible.')) return;
      // submit finish form
      const form = document.getElementById('finishForm');
      form && form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
      // actually submit normally
      form && form.submit();
    }
  });
})();
          `,
        }}
      />
    </div>
  );
}
