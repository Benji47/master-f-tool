import { Context } from "hono";
import "../styles/Homepage.css";

export function MatchLobbyPage({ c, matchId, currentUser }: { c: Context; matchId: string; currentUser: string }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-green-950 p-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-4 font-[Orbitron]">Match Lobby</h1>
        <p className="text-neutral-400 mb-6">Match ID: {matchId}</p>

        <div id="players" className="bg-neutral-900/50 rounded-lg p-4 border border-neutral-800 mb-4">
          <h3 className="text-lg text-white mb-2">Players</h3>
          <div id="playersList" className="space-y-2 text-neutral-200">
            {/* filled by client polling */}
            <div className="text-neutral-400">Loading players…</div>
          </div>
        </div>

        <div className="flex gap-3">
          <form id="startForm" action="/v1/match/start" method="post" className="flex-1">
            <input type="hidden" name="matchId" value={matchId} />
            <button id="startBtn" disabled className="w-full py-3 bg-neutral-700/40 text-neutral-400 rounded-md cursor-not-allowed">
              Start Match
            </button>
          </form>

          <form id="leaveForm" action="/v1/match/leave" method="post" className="flex-1">
            <input type="hidden" name="matchId" value={matchId} />
            <button type="submit" className="w-full py-3 bg-red-500 border-red-500 text-white rounded-md hover:bg-red-700 cursor-pointer transition-all">
              Leave
            </button>
          </form>
        </div>
      </div>

      <script
        dangerouslySetInnerHTML={{
          __html: `
(function(){
  var matchId = ${JSON.stringify(matchId)};
  var currentUser = ${JSON.stringify(currentUser)};
  var decodedUser = (typeof currentUser === 'string' && currentUser.length) ? decodeURIComponent(currentUser) : currentUser;
  var playersList = document.getElementById('playersList');
  var startBtn = document.getElementById('startBtn');

  function safeDecode(s){
    try{
      if(typeof s === 'string' && s.length){
        return decodeURIComponent(s);
      }
    }catch(e){}
    return s;
  }

  function renderPlayers(doc){
    playersList.innerHTML = '';
    const players = (doc.players || []);
    players.forEach((p, idx) => {
      const displayName = safeDecode(p.username) || p.id;
      const div = document.createElement('div');
      div.className = 'flex justify-between items-center bg-neutral-800/30 p-2 rounded';
      div.innerHTML = '<div><div class="font-semibold text-white">'+(displayName)+'</div><div class="text-xs text-neutral-400">ELO: '+(p.elo||0)+' — Wins: '+(p.wins||0)+' — Losses: '+(p.loses||0)+'</div></div><div class="text-sm text-neutral-300">#'+(idx+1)+'</div>';
      playersList.appendChild(div);
    });

    if(players.length >= 4) {
      startBtn.disabled = false;
      startBtn.className = 'w-full py-3 bg-green-500 text-white rounded-md hover:bg-green-700 cursor-pointer transition-all';
    } else {
      startBtn.disabled = true;
      startBtn.className = 'w-full py-3 bg-neutral-700/40 text-neutral-400 rounded-md';
    }
  }

  async function fetchState(){
    try{
      const res = await fetch('/v1/match/state?matchId=' + encodeURIComponent(matchId));
      if(res.ok){
        const doc = await res.json();
        renderPlayers(doc);
      }
    }catch(e){ console.error(e); }
  }

  // initial load + polling
  fetchState();
  const poll = setInterval(fetchState, 2000);

  // stop polling when navigating away
  window.addEventListener('beforeunload', function(){ clearInterval(poll); });
})();
          `,
        }}
      />
    </div>
  );
}
