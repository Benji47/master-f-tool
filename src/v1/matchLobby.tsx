import { Context } from "hono";

export function MatchLobbyPage({ c, currentUser }: { c: Context; currentUser: string }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-green-950 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-white font-[Orbitron]">Match Lobbies</h1>
          <div className="flex gap-3">
            <form action="/v1/match/create" method="post">
              <button type="submit" className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white font-bold rounded-md transition-all">
                ➕ Create Match
              </button>
            </form>
            <a href="/v1/lobby">
              <button className="px-6 py-3 bg-red-500 hover:bg-red-700 text-white font-bold rounded-md transition-all">
                🏠 Return to Lobby
              </button>
            </a>
          </div>
        </div>

        {/* Matches Grid */}
        <div id="matchesContainer" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="col-span-full text-center text-neutral-400 py-8">Loading matches...</div>
        </div>
      </div>

      <script
        dangerouslySetInnerHTML={{
          __html: `
(function(){
  var currentUser = ${JSON.stringify(currentUser)};
  var decodedUser = (typeof currentUser === 'string' && currentUser.length) ? decodeURIComponent(currentUser) : currentUser;
  var container = document.getElementById('matchesContainer');
  var pollInterval = null;
  var playerCurrentMatchId = null;

  function safeDecode(s){
    try{
      if(typeof s === 'string' && s.length){
        return decodeURIComponent(s);
      }
    }catch(e){}
    return s;
  }

  function renderMatches(matches){
    container.innerHTML = '';
    playerCurrentMatchId = null; // Reset on each render
    
    if(!matches || matches.length === 0){
      container.innerHTML = '<div class="col-span-full text-center text-neutral-400 py-8">No matches available. Create one to get started!</div>';
      return;
    }

    matches.forEach((match) => {
      const players = match.players || [];
      const isFull = players.length >= match.maxPlayers;
      const isPlaying = match.state === 'playing';
      const isPlayerInMatch = players.some(p => p.username === decodedUser || p.id === decodedUser);
      
      // Track which match the player is in
      if(isPlayerInMatch && !playerCurrentMatchId) {
        playerCurrentMatchId = match.$id;
      }
      
      const matchDiv = document.createElement('div');
      matchDiv.className = 'bg-neutral-900/60 border ' + (isPlaying ? 'border-yellow-500' : 'border-neutral-800') + ' rounded-lg p-4 hover:border-green-500 transition-all';
      
      // Match header
      const header = document.createElement('div');
      header.className = 'flex justify-between items-center mb-4';
      const statusText = isPlaying ? '🔴 PLAYING' : (isFull ? 'FULL' : 'OPEN');
      header.innerHTML = '<div><h3 class="text-lg font-bold text-white">Match</h3><p class="text-xs text-neutral-400 mt-1">ID: ' + match.$id.substring(0, 8) + '...</p></div><div class="text-right"><div class="text-sm font-semibold text-white">' + players.length + '/' + match.maxPlayers + '</div><div class="text-xs ' + (isPlaying ? 'text-yellow-400' : 'text-neutral-400') + '">' + statusText + '</div></div>';
      
      // Players list
      const playersList = document.createElement('div');
      playersList.className = 'space-y-2 mb-4';
      
      // Show 4 slots
      for(let i = 0; i < match.maxPlayers; i++){
        const player = players[i];
        const slot = document.createElement('div');
        slot.className = 'bg-neutral-800/40 border border-neutral-700 rounded p-2 flex items-center justify-between';
        
        if(player){
          const displayName = safeDecode(player.username) || player.id;
          const isCurrentUser = player.username === decodedUser || player.id === decodedUser;
          slot.innerHTML = '<div><div class="text-sm font-semibold text-white">' + displayName + (isCurrentUser ? ' (You)' : '') + '</div><div class="text-xs text-neutral-400">ELO: ' + (player.elo || 0) + ' • W: ' + (player.wins || 0) + ' L: ' + (player.loses || 0) + '</div></div><div class="text-xs font-bold text-green-400">#' + (i+1) + '</div>';
        } else {
          slot.className += ' bg-neutral-800/20 border-dashed';
          slot.innerHTML = '<div class="text-neutral-500 text-sm">Empty Slot</div><div class="text-xs font-bold text-neutral-600">#' + (i+1) + '</div>';
        }
        playersList.appendChild(slot);
      }
      
      // Display scores if match is playing
      if(isPlaying && match.scores && match.scores.length > 0){
        const scoresDiv = document.createElement('div');
        scoresDiv.className = 'bg-neutral-800/50 rounded p-3 mb-4 border border-neutral-700';
        
        const scoresTitle = document.createElement('div');
        scoresTitle.className = 'text-xs font-bold text-yellow-400 mb-2';
        scoresTitle.textContent = '⚔️ CURRENT SCORES';
        scoresDiv.appendChild(scoresTitle);
        
        match.scores.forEach((game, idx) => {
          const gameScore = document.createElement('div');
          gameScore.className = 'text-xs text-neutral-300 mb-1 flex justify-between';
          
          const teamANames = (game.a || []).map(id => {
            const p = players.find(pl => pl.id === id);
            return safeDecode(p?.username || id) || id;
          }).join(' + ');
          
          const teamBNames = (game.b || []).map(id => {
            const p = players.find(pl => pl.id === id);
            return safeDecode(p?.username || id) || id;
          }).join(' + ');
          
          gameScore.innerHTML = '<span>Game ' + (idx + 1) + ':</span><span>' + teamANames + ' <span class="font-bold text-green-400">' + game.scoreA + '</span> vs <span class="font-bold text-red-400">' + game.scoreB + '</span> ' + teamBNames + '</span>';
          scoresDiv.appendChild(gameScore);
        });
        
        playersList.appendChild(scoresDiv);
      }
      
      // Actions
      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'flex gap-2';
      
      if(isPlayerInMatch){
        if(isPlaying){
          // Player is in a playing match - show "Go to Match" button
          const goForm = document.createElement('form');
          goForm.action = '/v1/match/join-specific';
          goForm.method = 'post';
          goForm.className = 'w-full';
          
          const matchIdInput = document.createElement('input');
          matchIdInput.type = 'hidden';
          matchIdInput.name = 'matchId';
          matchIdInput.value = match.$id;
          goForm.appendChild(matchIdInput);
          
          const goBtnElement = document.createElement('button');
          goBtnElement.type = 'submit';
          goBtnElement.className = 'w-full py-2 bg-yellow-600 text-white rounded text-sm font-bold hover:bg-yellow-700 cursor-pointer transition-all';
          goBtnElement.textContent = '🎮 GO TO MATCH';
          goForm.appendChild(goBtnElement);
          
          actionsDiv.appendChild(goForm);
        } else {
          // Player is in this match - show Start and Leave
          const startForm = document.createElement('form');
          startForm.action = '/v1/match/start';
          startForm.method = 'post';
          startForm.className = 'flex-1';
          
          const matchIdInput = document.createElement('input');
          matchIdInput.type = 'hidden';
          matchIdInput.name = 'matchId';
          matchIdInput.value = match.$id;
          startForm.appendChild(matchIdInput);
          
          const startBtn = document.createElement('button');
          startBtn.type = 'submit';
          startBtn.disabled = !isFull;
          startBtn.className = isFull ? 'w-full py-2 bg-green-500 text-white rounded text-sm font-bold hover:bg-green-700 cursor-pointer transition-all' : 'w-full py-2 bg-neutral-700/40 text-neutral-400 rounded text-sm cursor-not-allowed';
          startBtn.textContent = isFull ? '🚀 START' : '⏳ WAITING (' + players.length + '/4)';
          startForm.appendChild(startBtn);
          
          const leaveForm = document.createElement('form');
          leaveForm.action = '/v1/match/leave';
          leaveForm.method = 'post';
          leaveForm.className = 'flex-1';
          
          const leaveMatchIdInput = document.createElement('input');
          leaveMatchIdInput.type = 'hidden';
          leaveMatchIdInput.name = 'matchId';
          leaveMatchIdInput.value = match.$id;
          leaveForm.appendChild(leaveMatchIdInput);
          
          const leaveBtn = document.createElement('button');
          leaveBtn.type = 'submit';
          leaveBtn.className = 'w-full py-2 bg-red-500 text-white rounded text-sm font-bold hover:bg-red-700 cursor-pointer transition-all';
          leaveBtn.textContent = '❌ LEAVE';
          leaveForm.appendChild(leaveBtn);
          
          actionsDiv.appendChild(startForm);
          actionsDiv.appendChild(leaveForm);
        }
      } else {
        // Player is not in this match
        if(isPlaying){
          // Playing match - can't join, just view
          const viewBtn = document.createElement('button');
          viewBtn.disabled = true;
          viewBtn.className = 'w-full py-2 bg-neutral-700/40 text-neutral-400 rounded text-sm cursor-not-allowed';
          viewBtn.textContent = '👁️ VIEWING';
          actionsDiv.appendChild(viewBtn);
        } else if(isFull){
          const disabledBtn = document.createElement('button');
          disabledBtn.disabled = true;
          disabledBtn.className = 'w-full py-2 bg-neutral-700/40 text-neutral-400 rounded text-sm cursor-not-allowed';
          disabledBtn.textContent = '🔒 FULL';
          actionsDiv.appendChild(disabledBtn);
        } else if(playerCurrentMatchId){
          // Player is already in a different match
          const disabledBtn = document.createElement('button');
          disabledBtn.disabled = true;
          disabledBtn.className = 'w-full py-2 bg-neutral-700/40 text-neutral-400 rounded text-sm cursor-not-allowed';
          disabledBtn.textContent = '⛔ ALREADY IN MATCH';
          actionsDiv.appendChild(disabledBtn);
        } else {
          const joinForm = document.createElement('form');
          joinForm.action = '/v1/match/join-specific';
          joinForm.method = 'post';
          joinForm.className = 'w-full';
          
          const joinMatchIdInput = document.createElement('input');
          joinMatchIdInput.type = 'hidden';
          joinMatchIdInput.name = 'matchId';
          joinMatchIdInput.value = match.$id;
          joinForm.appendChild(joinMatchIdInput);
          
          const joinBtn = document.createElement('button');
          joinBtn.type = 'submit';
          joinBtn.className = 'w-full py-2 bg-blue-600 text-white rounded text-sm font-bold hover:bg-blue-700 cursor-pointer transition-all';
          joinBtn.textContent = '➕ JOIN';
          joinForm.appendChild(joinBtn);
          
          actionsDiv.appendChild(joinForm);
        }
      }
      
      matchDiv.appendChild(header);
      matchDiv.appendChild(playersList);
      matchDiv.appendChild(actionsDiv);
      container.appendChild(matchDiv);
    });
  }

  async function fetchMatches(){
    try{
      const res = await fetch('/v1/match/list');
      if(res.ok){
        const data = await res.json();
        renderMatches(data.matches || []);
      }
    }catch(e){ console.error('Failed to fetch matches:', e); }
  }

  // initial load + polling every 4 seconds
  fetchMatches();
  pollInterval = setInterval(fetchMatches, 4000);

  // stop polling when navigating away
  window.addEventListener('beforeunload', function(){ 
    if(pollInterval) clearInterval(pollInterval); 
  });
})();
          `,
        }}
      />
    </div>
  );
}
