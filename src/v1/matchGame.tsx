import { Context } from "hono";
import "../styles/Homepage.css";

export function MatchGamePage({ c, match }: { c: Context; match: any }) {
  const players = match.players || [];
  const scores = match.scores || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-green-950 p-6">
      <div className="max-w-6xl mx-auto">
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
            <div key={idx} className="bg-neutral-900/50 rounded-lg p-4 border border-neutral-800">
              <div className="flex items-center justify-between mb-4">
                {/* Left team */}
                <div className="flex flex-col items-start gap-2 w-1/3">
                  <div className="font-semibold text-white text-sm">
                    {s.a.map((id:string,i:number)=> {
                      const p = players.find((x:any)=>x.id===id);
                      return <span key={i}>{p ? p.username : id}{i < s.a.length-1 ? ' / ' : ''}</span>;
                    })}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <button className="px-3 py-1 bg-green-600 hover:bg-green-700 cursor-pointer rounded text-sm" data-idx={idx} data-side="a" data-delta="10">+10</button>
                    <button className="px-3 py-1 bg-green-500 hover:bg-green-600 cursor-pointer rounded text-sm" data-idx={idx} data-side="a" data-delta="5">+5</button>
                    <button className="px-3 py-1 bg-green-400 hover:bg-green-500 cursor-pointer rounded text-sm" data-idx={idx} data-side="a" data-delta="1">+1</button>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <button className="px-3 py-1 bg-red-600 hover:bg-red-700 cursor-pointer rounded text-sm" data-idx={idx} data-side="a" data-delta="-10">-10</button>
                    <button className="px-3 py-1 bg-red-500 hover:bg-red-600 cursor-pointer rounded text-sm" data-idx={idx} data-side="a" data-delta="-5">-5</button>
                    <button className="px-3 py-1 bg-red-400 hover:bg-red-500 cursor-pointer rounded text-sm" data-idx={idx} data-side="a" data-delta="-1">-1</button>
                  </div>
                </div>

                {/* Score center */}
                <div className="text-3xl font-bold text-white text-center">
                  <span id={`scoreA-${idx}`}>{s.scoreA}</span>
                  <span className="mx-4 text-neutral-400">:</span>
                  <span id={`scoreB-${idx}`}>{s.scoreB}</span>
                </div>

                {/* Right team */}
                <div className="flex flex-col items-end gap-2 w-1/3">
                  <div className="font-semibold text-white text-sm">
                    {s.b.map((id:string,i:number)=> {
                      const p = players.find((x:any)=>x.id===id);
                      return <span key={i}>{p ? p.username : id}{i < s.b.length-1 ? ' / ' : ''}</span>;
                    })}
                  </div>
                  <div className="flex gap-2 flex-wrap justify-end">
                    <button className="px-3 py-1 bg-green-600 hover:bg-green-700 cursor-pointer rounded text-sm" data-idx={idx} data-side="b" data-delta="10">+10</button>
                    <button className="px-3 py-1 bg-green-500 hover:bg-green-600 cursor-pointer rounded text-sm" data-idx={idx} data-side="b" data-delta="5">+5</button>
                    <button className="px-3 py-1 bg-green-400 hover:bg-green-500 cursor-pointer rounded text-sm" data-idx={idx} data-side="b" data-delta="1">+1</button>
                  </div>
                  <div className="flex gap-2 flex-wrap justify-end">
                    <button className="px-3 py-1 bg-red-600 hover:bg-red-700 cursor-pointer rounded text-sm" data-idx={idx} data-side="b" data-delta="-10">-10</button>
                    <button className="px-3 py-1 bg-red-500 hover:bg-red-600 cursor-pointer rounded text-sm" data-idx={idx} data-side="b" data-delta="-5">-5</button>
                    <button className="px-3 py-1 bg-red-400 hover:bg-red-500 cursor-pointer rounded text-sm" data-idx={idx} data-side="b" data-delta="-1">-1</button>
                  </div>
                </div>
              </div>

              {/* Vyrazacka section */}
              <div className="border-t border-neutral-700 pt-4 mt-4">
                <h4 className="text-sm font-semibold text-neutral-300 mb-3">Vyrazacka</h4>
                <div className="grid grid-cols-2 gap-4">
                  {/* Left team vyrazacka */}
                  <div className="space-y-2">
                    {s.a.map((id: string) => {
                      const p = players.find((x: any) => x.id === id);
                      const vyr = s.vyrazacka?.[id] ?? 0;
                      return (
                        <div key={id} className="flex items-center gap-2 bg-neutral-800/40 p-2 rounded">
                          <span className="text-sm text-neutral-300 flex-1">{p ? p.username : id}</span>
                          <div className="flex gap-2 items-center">
                            <button className="px-2 py-1 bg-red-600 hover:bg-red-700 cursor-pointer rounded text-xs text-white" data-idx={idx} data-player-id={id} data-vyr-delta="-1">-1</button>
                            <span id={`vyr-${idx}-${id}`} className="text-white font-bold min-w-[2rem] text-center">{vyr}</span>
                            <button className="px-2 py-1 bg-green-600 hover:bg-green-700 cursor-pointer rounded text-xs text-white" data-idx={idx} data-player-id={id} data-vyr-delta="1">+1</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Right team vyrazacka */}
                  <div className="space-y-2">
                    {s.b.map((id: string) => {
                      const p = players.find((x: any) => x.id === id);
                      const vyr = s.vyrazacka?.[id] ?? 0;
                      return (
                        <div key={id} className="flex items-center gap-2 bg-neutral-800/40 p-2 rounded">
                          <span className="text-sm text-neutral-300 flex-1">{p ? p.username : id}</span>
                          <div className="flex gap-2 items-center">
                            <button className="px-2 py-1 bg-red-600 hover:bg-red-700 cursor-pointer rounded text-xs text-white" data-idx={idx} data-player-id={id} data-vyr-delta="-1">-1</button>
                            <span id={`vyr-${idx}-${id}`} className="text-white font-bold min-w-[2rem] text-center">{vyr}</span>
                            <button className="px-2 py-1 bg-green-600 hover:bg-green-700 cursor-pointer rounded text-xs text-white" data-idx={idx} data-player-id={id} data-vyr-delta="1">+1</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex gap-3">
          <a href="/v1/match/lobby" className="flex-1">
            <button className="w-full px-6 py-2 bg-neutral-800/60 hover:bg-neutral-800 cursor-pointer text-white rounded-md">← Back to Lobby</button>
          </a>

          <form id="finishForm" action="/v1/match/game/finish" method="post" className="flex-1">
            <input type="hidden" name="matchId" value={match.$id} />
            <button id="finishBtn" type="button" className="w-full px-6 py-2 bg-blue-600 hover:bg-blue-700 cursor-pointer text-white rounded-md">Finish Match</button>
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

  async function sendVyrazackaUpdate(idx, playerId, delta){
    try{
      const form = new FormData();
      form.append('matchId', matchId);
      form.append('index', String(idx));
      form.append('playerId', playerId);
      form.append('delta', String(delta));
      const res = await fetch('/v1/match/game/vyrazacka', { method: 'POST', body: form });
      if(!res.ok) {
        const txt = await res.text().catch(()=>null);
        console.error('vyrazacka update failed', txt);
        return;
      }
      const data = await res.json();
      // update DOM vyrazacka value
      const el = document.getElementById('vyr-'+idx+'-'+playerId);
      if(el) el.textContent = String(data.newValue);
    }catch(e){ console.error(e); }
  }

  document.addEventListener('click', function(e){
    const el = e.target;
    if(!(el instanceof HTMLElement)) return;
    
    // Score update buttons
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

    // Vyrazacka update buttons
    const vyrIdx = el.getAttribute('data-idx');
    const playerId = el.getAttribute('data-player-id');
    const vyrDelta = el.getAttribute('data-vyr-delta');
    if(vyrIdx !== null && playerId && vyrDelta){
      sendVyrazackaUpdate(Number(vyrIdx), playerId, Number(vyrDelta));
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

  // ---- ADD POLLING HERE ----
  async function pollState(){
    const res = await fetch('/v1/match/state?matchId=' + encodeURIComponent(matchId));
    if (!res.ok) return;

    const doc = await res.json();

    if (doc.state === "finished") {
      window.location.href = "/v1/match/result?matchId=" + encodeURIComponent(matchId);
      return;
    }

    // update scores
    if (Array.isArray(doc.scores)) {
      doc.scores.forEach((s, i) => {
        const a = document.getElementById('scoreA-'+i);
        const b = document.getElementById('scoreB-'+i);
        if (a) a.textContent = String(s.scoreA);
        if (b) b.textContent = String(s.scoreB);

        // vyrazacka
        if (s.vyrazacka) {
          for (const pid in s.vyrazacka) {
            const el = document.getElementById('vyr-'+i+'-'+pid);
            if (el) el.textContent = String(s.vyrazacka[pid]);
          }
        }
      });
    }
  }

  pollState();
  const poll = setInterval(pollState, 4000);
  window.addEventListener("beforeunload", () => clearInterval(poll)); 


})();
          `,
        }}
      />
    </div>
  );
}
