"use strict";
const storageKey = "verzaubertes-wedding-games";
const maxCardsInDeck = 60;
const state = { games: [], activeGameId: null, activeView: "entry", draftPlayers: [] };
let storageReadFailed = false;
const $ = id => document.getElementById(id);
const homeView=$("homeView"),gameView=$("gameView"),showCreateButton=$("showCreateButton"),createGameForm=$("createGameForm"),gameNameInput=$("gameName"),playerNameInput=$("playerName"),draftPlayerList=$("draftPlayerList"),createMessage=$("createMessage"),savedGamesList=$("savedGamesList"),entryGrid=$("entryGrid"),roundForm=$("roundForm"),roundTitle=$("roundTitle"),cardsCount=$("cardsCount"),bidTotal=$("bidTotal"),trickTotal=$("trickTotal"),formMessage=$("formMessage"),scoreRoundButton=$("scoreRoundButton"),historyTable=$("historyTable"),scoreGlance=$("scoreGlance"),undoButton=$("undoButton"),finishGameButton=$("finishGameButton"),backButton=$("backButton"),entryView=$("entryView"),statsView=$("statsView"),pointsTrendChart=$("pointsTrendChart"),hitRateChart=$("hitRateChart"),bidTrickChart=$("bidTrickChart"),leaderboardChart=$("leaderboardChart"),statsGrid=$("statsGrid"),heroStatus=$("heroStatus"),heroHelp=$("heroHelp");
const viewTabs=document.querySelectorAll(".view-tab");
const chartColors=["#f4c568","#85baff","#85ffe0","#ff8eaf","#bc9cff","#ffa678"];
function loadGames() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "[]");
    state.games = validateGames(saved);
  } catch {
    state.games = [];
    storageReadFailed = true;
    notify("Lagrede spill kunne ikke leses. Originaldataene er ikke slettet. Kontroller sikkerhetskopien før du lagrer nye spill.");
  }
}
function saveGames() {
  if (storageReadFailed) { notify("Lagring er sperret for å beskytte data som ikke kunne leses. Eksporter originaldataene og bruk en annen nettleser inntil dataene er gjenopprettet."); return false; }
  try { localStorage.setItem(storageKey, JSON.stringify(state.games)); return true; }
  catch { notify("Kunne ikke lagre på denne enheten. Frigjør plass eller tillat lokal lagring, og prøv igjen."); return false; }
}
function makeId(prefix){return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;}
function getActiveGame(){return state.games.find(g=>g.id===state.activeGameId)||null;}
function getRoundNumber(game=getActiveGame()){return game?game.rounds.length+1:1;}
function getCardsThisRound(game=getActiveGame()){return getRoundNumber(game);}
function getMaxRounds(game=getActiveGame()){return game?.players.length?Math.floor(maxCardsInDeck/game.players.length):0;}
function getTotals(game=getActiveGame()){
 if(!game)return [];
 const totals=new Map(game.players.map(p=>[p.id,0]));
 game.rounds.forEach(r=>r.results.forEach(v=>totals.set(v.playerId,(totals.get(v.playerId)||0)+v.score)));
 return game.players.map(p=>({...p,score:totals.get(p.id)||0}));
}
function getWinner(game){if(!game.rounds.length)return null;return getTotals(game).sort((a,b)=>b.score-a.score)[0]||null;}
function getPlayerStats(game=getActiveGame()){
 if(!game)return [];
 const metrics=new Map(game.players.map(p=>[p.id,{bid:0,tricks:0,hits:0,wins:0}]));
 game.rounds.forEach(r=>{const best=Math.max(...r.results.map(v=>v.score));r.results.forEach(v=>{
  const m=metrics.get(v.playerId);m.bid+=v.bid;m.tricks+=v.tricks;m.hits+=Number(v.bid===v.tricks);m.wins+=Number(v.score===best);
 });});
 const n=game.rounds.length;
 return getTotals(game).map(p=>{const m=metrics.get(p.id);return {...p,playedRounds:n,avgBid:n?m.bid/n:0,avgTricks:n?m.tricks/n:0,hitRate:n?m.hits/n:0,winRate:n?m.wins/n:0};}).sort((a,b)=>b.score-a.score);
}
function getScoreTimeline(game=getActiveGame()){
 if(!game)return [];const running=new Map(game.players.map(p=>[p.id,0]));
 return game.rounds.map((r,i)=>{r.results.forEach(v=>running.set(v.playerId,running.get(v.playerId)+v.score));return {round:i+1,scores:game.players.map(p=>({playerId:p.id,name:p.name,score:running.get(p.id)}))};});
}
function scoreBid(bid,tricks){return bid===tricks?20+bid*10:-10*Math.abs(bid-tricks);}
function showHome(){state.activeGameId=null;homeView.classList.add("is-active");gameView.classList.remove("is-active");renderHome();}
function showGame(id){state.activeGameId=id;state.activeView="entry";homeView.classList.remove("is-active");gameView.classList.add("is-active");renderGame();}
function createGame(){
 if(state.draftPlayers.length<3){createMessage.textContent="Legg til minst tre spillere.";return;}
 const now=new Date(),game={id:makeId("game"),name:gameNameInput.value.trim()||`Wizard ${formatDate(now)}`,createdAt:now.toISOString(),completedAt:null,status:"active",players:state.draftPlayers.map(p=>({...p})),rounds:[]};
 state.games.unshift(game);
  if (!saveGames()) { state.games.shift(); return; }
  state.draftPlayers = [];
 gameNameInput.value="";playerNameInput.value="";createMessage.textContent="";
 showGame(game.id);
}
function addDraftPlayer(name){const clean=name.trim();if(!clean)return;if(state.draftPlayers.length>=6){createMessage.textContent="Denne appen støtter opptil seks Wizard-spillere.";return;}
 state.draftPlayers.push({id:makeId("player"),name:clean});playerNameInput.value="";createMessage.textContent="";renderDraftPlayers();}
function removeDraftPlayer(id){state.draftPlayers=state.draftPlayers.filter(p=>p.id!==id);renderDraftPlayers();}
function renderHome(){
 const active=state.games.filter(g=>g.status==="active").length;
 heroStatus.textContent=`${state.games.length} ${state.games.length===1?"lagret spill":"lagrede spill"}`;
 heroHelp.textContent=active?`${active} spill pågår fortsatt. Fortsett å føre poeng, eller start et nytt spill.`:"Opprett et spill, før poeng for hver runde, og lagre Wizard-historikken på denne enheten.";
 renderDraftPlayers();renderSavedGames();renderScoreGlance();
}
function renderDraftPlayers(){draftPlayerList.replaceChildren();if(!state.draftPlayers.length){draftPlayerList.innerHTML='<div class="empty-note">Ingen spillere er lagt til ennå.</div>';return;}
 state.draftPlayers.forEach(p=>{const chip=document.createElement("div"),name=document.createElement("span"),remove=document.createElement("button");chip.className="player-chip";name.textContent=p.name;remove.className="remove-player";remove.type="button";remove.title=`Fjern ${p.name}`;remove.setAttribute("aria-label",remove.title);remove.textContent="×";remove.addEventListener("click",()=>removeDraftPlayer(p.id));chip.append(name,remove);draftPlayerList.append(chip);});
}
function renderSavedGames(){savedGamesList.replaceChildren();if(!state.games.length){savedGamesList.innerHTML='<div class="empty-note">Ingen lagrede spill ennå.</div>';return;}
 state.games.forEach(g=>{const winner=getWinner(g),card=document.createElement("article");card.className="saved-game";
 card.innerHTML=`<div class="saved-main"><div><div class="saved-title"></div><div class="saved-meta">${formatDate(new Date(g.createdAt))} · ${g.rounds.length} ${g.rounds.length===1?"runde":"runder"} · ${g.status==="active"?"Pågår":"Avsluttet"}</div></div><button class="secondary-action open-game" type="button">${g.status==="active"?"Fortsett":"Åpne"}</button></div><div class="saved-detail"></div>`;
 card.querySelector(".saved-title").textContent=g.name;
 const names=g.players.map(p=>p.name).join(", ");
 const leaders=winner?getTotals(g).filter(p=>p.score===winner.score).map(p=>p.name).join(" og "):"";
 card.querySelector(".saved-detail").textContent=winner?`${leaders} ${g.status==="complete"?"vant":"leder"} med ${winner.score} poeng. Spillere: ${names}`:`Spillere: ${names}`;
 card.querySelector(".open-game").addEventListener("click",()=>showGame(g.id));savedGamesList.append(card);});
}
function makeRangeInput(player,type,max){
 const wrap=document.createElement("div");wrap.className="number-field";
 const label=document.createElement("label");label.className="range-label";label.htmlFor=`${type}-${player.id}`;
 const labelText=document.createElement("span");labelText.textContent=type==="bid"?"Meldte stikk":"Vunne stikk";
 const value=document.createElement("span");value.className="range-value";value.textContent="0";
 const input=document.createElement("input");input.id=`${type}-${player.id}`;input.name=input.id;input.type="range";input.min="0";input.max=String(max);input.step="1";input.value="0";input.dataset.type=type;input.dataset.playerId=player.id;
 input.addEventListener("input", () => { value.textContent = input.value; updateRoundMath(); });
  const controls = document.createElement("div"); controls.className = "step-controls";
  const minus = document.createElement("button"), plus = document.createElement("button");
  minus.type = plus.type = "button"; minus.textContent = "−"; plus.textContent = "+";
  minus.setAttribute("aria-label", `Reduser ${labelText.textContent.toLowerCase()} for ${player.name}`);
  plus.setAttribute("aria-label", `Øk ${labelText.textContent.toLowerCase()} for ${player.name}`);
  function changeBy(delta) { input.value = String(Math.min(max, Math.max(0, Number(input.value) + delta))); value.textContent = input.value; updateRoundMath(); }
  minus.addEventListener("click", () => changeBy(-1)); plus.addEventListener("click", () => changeBy(1));
  controls.append(minus, input, plus);
  label.append(labelText, value); wrap.append(label, controls); return wrap;
}
function renderGame(){const game=getActiveGame();if(!game){showHome();return;}renderActiveView();renderRoundMeta(game);renderRoundInputs(game);renderHistory(game);
 if (state.activeView === "stats") renderStats(game); renderScoreGlance(); updateRoundMath();
}
function renderActiveView(){const stats=state.activeView==="stats";entryView.classList.toggle("is-active",!stats);statsView.classList.toggle("is-active",stats);viewTabs.forEach(tab=>{const active=tab.dataset.view===state.activeView;tab.classList.toggle("is-active",active);tab.setAttribute("aria-selected",String(active));});}
function renderRoundMeta(game){const round=getRoundNumber(game),cards=getCardsThisRound(game),max=getMaxRounds(game);heroStatus.textContent=game.name;roundTitle.textContent=`Runde ${Math.min(round,Math.max(max,1))}`;cardsCount.textContent=`${Math.min(cards,max)} kort`;
 heroHelp.textContent=game.status==="complete"?"Dette spillet er avsluttet. Du kan fortsatt se poeng og statistikk.":round>max?"Alle mulige runder er poengberegnet. Avslutt spillet for å arkivere det.":`Del ut ${cards} kort til hver spiller. Summen av meldte stikk kan ikke være ${cards}.`;
 undoButton.disabled=!game.rounds.length||game.status==="complete";finishGameButton.disabled=undoButton.disabled;
}
function renderRoundInputs(game){entryGrid.replaceChildren();const cards=getCardsThisRound(game),gameReady=game.status==="active"&&getRoundNumber(game)<=getMaxRounds(game);
 game.players.forEach(p=>{const row=document.createElement("div"),name=document.createElement("div");row.className="entry-row";name.className="entry-name";name.textContent=p.name;row.append(name,makeRangeInput(p,"bid",cards),makeRangeInput(p,"tricks",cards));entryGrid.append(row);});
 scoreRoundButton.disabled = !gameReady;
  entryGrid.querySelectorAll("input, button").forEach((control) => { control.disabled = !gameReady; });
}
function renderHistory(game){const head=game.players.map(p=>`<th scope="col">${escapeHtml(p.name)}</th>`).join("");const rows=game.rounds.map((r,i)=>`<tr><th scope="row">R${i+1}</th>${game.players.map(p=>`<td>${r.results.find(v=>v.playerId===p.id)?.score||0}</td>`).join("")}</tr>`).join("");historyTable.innerHTML=`<thead><tr><th scope="col">Runde</th>${head}</tr></thead><tbody>${rows||`<tr><td colspan="${game.players.length+1}">Ingen runder er lagret ennå.</td></tr>`}<tr class="total-row"><th scope="row">Totalt</th>${getTotals(game).map(p=>`<td>${p.score}</td>`).join("")}</tr></tbody>`;}
function renderStats(game=getActiveGame()){
 [pointsTrendChart,hitRateChart,bidTrickChart,leaderboardChart,statsGrid].forEach(e=>e.replaceChildren());
 if(!game||!game.rounds.length){pointsTrendChart.innerHTML='<div class="empty-note">Lagre en runde for å se diagrammer.</div>';return;}
 const stats=getPlayerStats(game);renderPointsTrend(game);renderHitRateChart(stats);renderBidTrickChart(stats);renderLeaderboardChart(stats);renderStatCards(stats);
}
function createSvgElement(name,attributes){const el=document.createElementNS("http://www.w3.org/2000/svg",name);Object.entries(attributes).forEach(([k,v])=>el.setAttribute(k,v));return el;}
function renderPointsTrend(game){
 const timeline=getScoreTimeline(game),width=680,height=280,pad={top:22,right:22,bottom:34,left:44};
 const scores=timeline.flatMap(r=>r.scores.map(p=>p.score)),lo=Math.min(...scores,0),hi=Math.max(...scores,1),range=Math.max(hi-lo,1);
 const x=i=>pad.left+i/Math.max(timeline.length-1,1)*(width-pad.left-pad.right),y=s=>height-pad.bottom-(s-lo)/range*(height-pad.top-pad.bottom);
 const svg=createSvgElement("svg",{viewBox:`0 0 ${width} ${height}`,role:"img","aria-label":"Samlet poengsum etter hver runde"});
 [...new Set([lo,Math.round((lo+hi)/2),hi])].forEach(tick=>{const label=createSvgElement("text",{x:pad.left-10,y:y(tick)+4,class:"axis-label","text-anchor":"end"});label.textContent=tick;svg.append(createSvgElement("line",{x1:pad.left,x2:width-pad.right,y1:y(tick),y2:y(tick),class:"grid-line"}),label);});
 timeline.forEach((r,i)=>{const label=createSvgElement("text",{x:x(i),y:height-10,class:"axis-label","text-anchor":"middle"});label.textContent=r.round;svg.append(label);});
 game.players.forEach((p,i)=>{const color=chartColors[i%chartColors.length];const values=timeline.map(r=>r.scores.find(v=>v.playerId===p.id).score);svg.append(createSvgElement("polyline",{points:values.map((v,j)=>`${x(j)},${y(v)}`).join(" "),fill:"none",stroke:color,"stroke-width":4,"stroke-linecap":"round","stroke-linejoin":"round"}));values.forEach((v,j)=>svg.append(createSvgElement("circle",{cx:x(j),cy:y(v),r:4.5,fill:color})));});
 const legend=document.createElement("div");legend.className="chart-legend";game.players.forEach((p,i)=>{const el=document.createElement("div");el.className="legend-item";el.innerHTML='<span class="legend-swatch"></span><span></span>';el.firstChild.style.background=chartColors[i%chartColors.length];el.lastChild.textContent=p.name;legend.append(el);});pointsTrendChart.append(svg,legend);
}
function renderHitRateChart(stats){stats.forEach((p,i)=>{const row=document.createElement("div");row.className="metric-row";row.innerHTML=`<div class="metric-label"></div><div class="metric-track"><div class="metric-bar" style="width:${Math.round(p.hitRate*100)}%;background:${chartColors[i%chartColors.length]}"></div></div><div class="metric-value">${formatPercent(p.hitRate)}</div>`;row.firstChild.textContent=p.name;hitRateChart.append(row);});}
function renderBidTrickChart(stats){const max=Math.max(...stats.flatMap(p=>[p.avgBid,p.avgTricks]),1);stats.forEach((p,i)=>{const row=document.createElement("div");row.className="dual-metric";row.innerHTML=`<div class="metric-label"></div><div class="dual-bars"><div class="metric-track"><div class="metric-bar" style="width:${p.avgBid/max*100}%;background:${chartColors[i%chartColors.length]}"></div></div><div class="metric-track muted-track"><div class="metric-bar" style="width:${p.avgTricks/max*100}%"></div></div></div><div class="metric-value">${formatNumber(p.avgBid)} / ${formatNumber(p.avgTricks)}</div>`;row.firstChild.textContent=p.name;bidTrickChart.append(row);});}
function renderLeaderboardChart(stats){const scores=stats.map(p=>p.score),lo=Math.min(...scores,0),hi=Math.max(...scores,1),range=Math.max(hi-lo,1);stats.forEach(p=>{const row=document.createElement("div");row.className="chart-row";row.innerHTML=`<div class="chart-name"></div><div class="chart-track"><div class="chart-bar" style="width:${(p.score-lo)/range*82+18}%"></div></div><div class="chart-score">${p.score}</div>`;row.firstChild.textContent=p.name;leaderboardChart.append(row);});}
function renderStatCards(stats){stats.forEach(p=>{const card=document.createElement("article");card.className="stat-card";card.innerHTML=`<div class="stat-name"></div><div class="stat-line"><span>Andel runder vunnet</span><strong>${formatPercent(p.winRate)}</strong></div><div class="stat-line"><span>Andel riktige meldinger</span><strong>${formatPercent(p.hitRate)}</strong></div><div class="stat-line"><span>Gjennomsnittlig melding</span><strong>${formatNumber(p.avgBid)}</strong></div><div class="stat-line"><span>Gjennomsnittlig antall stikk</span><strong>${formatNumber(p.avgTricks)}</strong></div>`;card.firstChild.textContent=p.name;statsGrid.append(card);});}
function renderScoreGlance(){scoreGlance.replaceChildren();const game=getActiveGame();const players=game?getTotals(game).sort((a,b)=>b.score-a.score):state.games.slice(0,2).map(g=>({name:g.name,score:getWinner(g)?.score||0}));if(!players.length){scoreGlance.innerHTML='<div class="glance-item"><div class="glance-name">Ingen spill ennå</div><div class="glance-score">0</div></div>';return;}players.forEach(p=>{const row=document.createElement("div");row.className="glance-item";row.innerHTML='<div class="glance-name"></div><div class="glance-score"></div>';row.firstChild.textContent=p.name;row.lastChild.textContent=p.score;scoreGlance.append(row);});}
function updateRoundMath(){const game=getActiveGame();if(!game)return;const cards=getCardsThisRound(game);const sum=type=>[...entryGrid.querySelectorAll(`input[data-type="${type}"]`)].reduce((s,e)=>s+Number(e.value),0);const bids=sum("bid"),tricks=sum("tricks"),gameReady=game.status==="active"&&getRoundNumber(game)<=getMaxRounds(game);bidTotal.textContent=`Meldte stikk totalt: ${bids}`;trickTotal.textContent=`Vunne stikk: ${tricks} / ${cards}`;scoreRoundButton.disabled=!gameReady||bids===cards||tricks!==cards;
 if (game.status === "complete") formMessage.textContent = "Dette spillet er avsluttet.";
  else if (!gameReady) formMessage.textContent = "Alle runder er poengberegnet. Avslutt spillet for å se sluttresultatet.";
 else if(bids===cards)formMessage.textContent=`Summen av meldte stikk kan ikke være ${cards} i denne runden.`;
 else if(tricks!==cards)formMessage.textContent=`Summen av vunne stikk må være ${cards}.`;else formMessage.textContent="";
}
function saveRound(){const game=getActiveGame();if(!game)return;const cards=getCardsThisRound(game);if(game.status==="complete"||getRoundNumber(game)>getMaxRounds(game))return;
 const results=game.players.map(p=>{const bid=Number($(`bid-${p.id}`).value),tricks=Number($(`tricks-${p.id}`).value);return {playerId:p.id,bid,tricks,score:scoreBid(bid,tricks)};});
 if(results.some(v=>!Number.isInteger(v.bid)||!Number.isInteger(v.tricks)||v.bid<0||v.tricks<0||v.bid>cards||v.tricks>cards)){formMessage.textContent="Velg gyldige heltall for meldte og vunne stikk.";return;}
 if(results.reduce((s,v)=>s+v.bid,0)===cards){formMessage.textContent=`Summen av meldte stikk kan ikke være ${cards}.`;return;}
 if(results.reduce((s,v)=>s+v.tricks,0)!==cards){formMessage.textContent=`Summen av vunne stikk må være ${cards}.`;return;}
 const previousTotals = getTotals(game);
  game.rounds.push({ cards, playedAt: new Date().toISOString(), results });
  if (!saveGames()) { game.rounds.pop(); return; }
  renderGame();
  celebrateRound(game, results, previousTotals);
}
function finishGame(){const game=getActiveGame();if(!game||!game.rounds.length||game.status==="complete")return;
 if(!window.confirm("Avslutte spillet? Du kan fortsatt se resultatene, men ikke endre rundene etterpå."))return;
 game.status = "complete"; game.completedAt = new Date().toISOString();
  if (!saveGames()) { game.status = "active"; game.completedAt = null; return; }
  renderGame(); celebrateFinal(game);
}
function undoRound(){const game=getActiveGame();if(!game||game.status==="complete"||!game.rounds.length)return;
 if(!window.confirm("Angre siste runde? Poengene fra denne runden fjernes."))return;
 const removed = game.rounds.pop();
  if (!saveGames()) { if (removed) game.rounds.push(removed); return; }
  renderGame(); notify("Siste runde er angret.");
}
function formatDate(date){return new Intl.DateTimeFormat("nb-NO",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}).format(date);}
function formatPercent(value){return `${Math.round(value*100)}%`;}
function formatNumber(value){return new Intl.NumberFormat("nb-NO",{minimumFractionDigits:1,maximumFractionDigits:1,useGrouping:false}).format(value);}
function escapeHtml(value){return String(value).replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"})[char]);}
createGameForm.addEventListener("submit",event=>{event.preventDefault();if((event.submitter?.value||"add")==="start")createGame();else {addDraftPlayer(playerNameInput.value);playerNameInput.focus();}});
showCreateButton.addEventListener("click",()=>gameNameInput.focus());
roundForm.addEventListener("submit",event=>{event.preventDefault();saveRound();});
undoButton.addEventListener("click",undoRound);finishGameButton.addEventListener("click",finishGame);backButton.addEventListener("click",showHome);
viewTabs.forEach(tab=>tab.addEventListener("click",()=>{state.activeView=tab.dataset.view;renderActiveView();if(state.activeView==="stats")renderStats();}));


// Optional presentation and backup features; scoring does not depend on these.
const preferenceKey = `${storageKey}-experience`;
let experience = { sound: false, effects: true };
let audioContext = null;
let confettiFrame = 0;
let toastTimer = 0;
function notify(message) {
  const toast = document.querySelector("#toast");
  if (!toast) return;
  toast.textContent = message; toast.classList.add("is-visible");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 6500);
}
function reducedMotion() { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; }
function savePreferences() {
  try { localStorage.setItem(preferenceKey, JSON.stringify(experience)); } catch { /* Preferences are optional. */ }
}
function updatePreferences() {
  const sound = document.querySelector("#soundButton"), effects = document.querySelector("#effectsButton");
  sound.textContent = experience.sound ? "♪ Lyd på" : "♪ Lyd av";
  sound.setAttribute("aria-pressed", String(experience.sound));
  effects.textContent = experience.effects ? "✦ Effekter på" : "✦ Effekter av";
  effects.setAttribute("aria-pressed", String(experience.effects));
  document.body.classList.toggle("effects-off", !experience.effects);
}
function playSound(final = false) {
  if (!experience.sound) return;
  try {
    const AudioConstructor = window.AudioContext || window.webkitAudioContext;
    if (!AudioConstructor) return;
    audioContext ||= new AudioConstructor();
    const play = () => {
      const notes = final ? [261.63, 329.63, 392, 523.25, 659.25, 783.99] : [392, 493.88, 587.33, 783.99];
      notes.forEach((frequency, index) => {
        const osc = audioContext.createOscillator(), gain = audioContext.createGain();
        const start = audioContext.currentTime + index * 0.105;
        osc.type = "sine"; osc.frequency.value = frequency;
        gain.gain.setValueAtTime(0, start); gain.gain.linearRampToValueAtTime(0.065, start + 0.018);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.38);
        osc.connect(gain); gain.connect(audioContext.destination); osc.start(start); osc.stop(start + 0.4);
        osc.onended = () => { osc.disconnect(); gain.disconnect(); };
      });
    };
    if (audioContext.state === "suspended") audioContext.resume().then(play).catch(() => {});
    else play();
  } catch { /* Audio is never required to save a round. */ }
}
function burst(final = false) {
  if (!experience.effects || reducedMotion()) return;
  const canvas = document.querySelector("#confettiCanvas"), ctx = canvas?.getContext("2d");
  if (!ctx) return;
  cancelAnimationFrame(confettiFrame);
  const w = window.innerWidth, h = window.innerHeight, dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = w * dpr; canvas.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const colors = ["#f4c568", "#85ffe0", "#bc9cff", "#ff8eaf"];
  const particles = Array.from({ length: final ? 120 : 72 }, (_, i) => ({
    x: w / 2, y: h * 0.45, vx: (Math.random() - 0.5) * 15,
    vy: -4 - Math.random() * 9, size: 3 + Math.random() * 5,
    angle: Math.random() * Math.PI, color: colors[i % colors.length]
  }));
  let last = 0, began = 0;
  function frame(time) {
    if (!began) began = time;
    const step = Math.min(last ? (time - last) / 16.67 : 1, 2); last = time;
    ctx.clearRect(0, 0, w, h);
    const opacity = Math.max(0, 1 - (time - began) / 1800);
    particles.forEach(p => {
      p.x += p.vx * step; p.y += p.vy * step; p.vy += 0.2 * step; p.angle += 0.08 * step;
      ctx.save(); ctx.globalAlpha = opacity; ctx.translate(p.x, p.y); ctx.rotate(p.angle);
      ctx.fillStyle = p.color; ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.55); ctx.restore();
    });
    if (time - began < 1800 && experience.effects && !reducedMotion()) confettiFrame = requestAnimationFrame(frame);
    else ctx.clearRect(0, 0, w, h);
  }
  confettiFrame = requestAnimationFrame(frame);
}
function openRecap(title, subtitle, items, final = false) {
  const dialog = document.querySelector("#recapDialog");
  document.querySelector("#recapTitle").textContent = title;
  document.querySelector("#recapSubtitle").textContent = subtitle;
  const list = document.querySelector("#recapList"); list.replaceChildren();
  items.forEach(item => {
    const row = document.createElement("div"); row.className = "recap-row";
    const text = document.createElement("div"), name = document.createElement("strong"), detail = document.createElement("span");
    name.textContent = item.name; detail.textContent = item.detail; text.append(name, detail);
    const points = document.createElement("strong"); points.className = `recap-points ${item.score < 0 ? "negative" : "positive"}`;
    points.textContent = `${!final && item.score > 0 ? "+" : ""}${item.score}`;
    row.append(text, points); list.append(row);
  });
  document.querySelector("#recapClose").textContent = final ? "Se sluttresultatet" : "Neste runde →";
  const game = getActiveGame();
  if (!final && game && getRoundNumber(game) > getMaxRounds(game)) document.querySelector("#recapClose").textContent = "Til poengoversikten →";
  if (typeof dialog.showModal === "function") { if (!dialog.open) dialog.showModal(); }
  else { notify(`${title}. ${subtitle}`); }
  playSound(final); burst(final);
}
function celebrateRound(game, results, previousTotals) {
  try {
    const exact = results.filter(result => result.bid === result.tricks).length;
    const previousBest = Math.max(...previousTotals.map(p => p.score));
    const previousLeaders = previousTotals.filter(p => p.score === previousBest).map(p => p.id);
    const totals = getTotals(game), best = Math.max(...totals.map(p => p.score));
    const leaders = totals.filter(p => p.score === best);
    const leadChanged = leaders.some(p => !previousLeaders.includes(p.id));
    let subtitle = `${exact} av ${game.players.length} spillere traff meldingen.`;
    if (exact === game.players.length) subtitle = "Alle traff meldingen. Ren Wizard-magi!";
    if (leadChanged) subtitle += ` Ny ledelse: ${leaders.map(p => p.name).join(" og ")}.`;
    openRecap(`Runde ${game.rounds.length} er i boks!`, subtitle, results.map(result => ({
      name: game.players.find(p => p.id === result.playerId).name, score: result.score,
      detail: `${result.bid} meldt · ${result.tricks} vunnet${result.bid === result.tricks ? " · Fulltreffer ✦" : ""}`
    })));
  } catch { notify("Runden er lagret."); }
}
function celebrateFinal(game) {
  try {
    const totals = getTotals(game).sort((a,b) => b.score - a.score), top = totals[0].score;
    const winners = totals.filter(p => p.score === top).map(p => p.name);
    openRecap(winners.length === 1 ? `${winners[0]} vinner!` : "Delt seier!",
      `${winners.join(" og ")} · ${top} poeng · ${game.rounds.length} runder`,
      totals.map(p => ({name:p.name, score:p.score, detail:p.score === top ? "Vinner ✦" : "Sluttresultat"})), true);
  } catch { notify("Spillet er avsluttet og lagret."); }
}
function validateGames(value) {
  if (!Array.isArray(value) || value.length > 2000) throw new Error("Invalid games");
  const gameIds = new Set();
  return value.map(g => {
    if (!g || typeof g.id !== "string" || !g.id || gameIds.has(g.id) || typeof g.name !== "string" ||
        !["active", "complete"].includes(g.status) || !Array.isArray(g.players) || g.players.length < 3 || g.players.length > 6 ||
        !Array.isArray(g.rounds) || g.rounds.length > Math.floor(60 / g.players.length) ||
        typeof g.createdAt !== "string" || !Number.isFinite(Date.parse(g.createdAt)) ||
        (g.completedAt !== null && (typeof g.completedAt !== "string" || !Number.isFinite(Date.parse(g.completedAt))))) throw new Error("Invalid game");
    gameIds.add(g.id); const ids = new Set();
    const players = g.players.map(p => {
      if (!p || typeof p.id !== "string" || !p.id || ids.has(p.id) || typeof p.name !== "string" || !p.name.trim()) throw new Error("Invalid player");
      ids.add(p.id); return {id:p.id,name:p.name};
    });
    const rounds = g.rounds.map((r,index) => {
      if (!r || r.cards !== index + 1 || !Array.isArray(r.results) || r.results.length !== players.length ||
          typeof r.playedAt !== "string" || !Number.isFinite(Date.parse(r.playedAt))) throw new Error("Invalid round");
      const seen = new Set();
      const results = r.results.map(v => {
        if (!v || !ids.has(v.playerId) || seen.has(v.playerId) || !Number.isInteger(v.bid) || !Number.isInteger(v.tricks) ||
            v.bid < 0 || v.bid > r.cards || v.tricks < 0 || v.tricks > r.cards || v.score !== scoreBid(v.bid,v.tricks)) throw new Error("Invalid result");
        seen.add(v.playerId); return {playerId:v.playerId,bid:v.bid,tricks:v.tricks,score:v.score};
      });
      if (results.reduce((s,v)=>s+v.tricks,0) !== r.cards || results.reduce((s,v)=>s+v.bid,0) === r.cards) throw new Error("Invalid totals");
      return {cards:r.cards,playedAt:r.playedAt,results};
    });
    return {id:g.id,name:g.name,createdAt:g.createdAt,completedAt:g.completedAt,status:g.status,players,rounds};
  });
}
function downloadBackup() {
  let raw = null;
  if (storageReadFailed) { try { raw = localStorage.getItem(storageKey); } catch {} }
  const data = raw ?? JSON.stringify({ format:"wizard-backup", version:1, exportedAt:new Date().toISOString(), games:state.games },null,2);
  const url = URL.createObjectURL(new Blob([data],{type:"application/json"}));
  const link = document.createElement("a"); link.href=url; link.download=`wizard-backup-${new Date().toISOString().slice(0,10)}.json`;
  document.body.append(link); link.click(); link.remove(); setTimeout(()=>URL.revokeObjectURL(url),1000);
  notify("Sikkerhetskopien er lastet ned. Oppbevar den et trygt sted.");
}
async function importBackup(file) {
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) { notify("Filen er for stor. Maksimal størrelse er 5 MB."); return; }
  try {
    const parsed = JSON.parse(await file.text());
    if (!Array.isArray(parsed) && (parsed?.format !== "wizard-backup" || parsed.version !== 1)) throw new Error("Unknown format");
    const incoming = validateGames(Array.isArray(parsed) ? parsed : parsed.games);
    const known = new Set(state.games.map(g=>g.id)); const additions = incoming.filter(g=>!known.has(g.id));
    if (!additions.length) { notify("Ingen nye spill i sikkerhetskopien."); return; }
    if (!window.confirm(`Importer ${additions.length} spill? Eksisterende spill beholdes. Spill med samme ID hoppes over.`)) return;
    const previous = state.games; state.games = [...additions,...state.games];
    if (!saveGames()) { state.games=previous; return; }
    if (getActiveGame()) renderGame(); else renderHome(); notify(`${additions.length} spill er importert.`);
  } catch { notify("Sikkerhetskopien kunne ikke importeres. Filformatet eller spilldataene er ugyldige."); }
}
function initializeExperience() {
  try { const saved = JSON.parse(localStorage.getItem(preferenceKey) || "null");
    if (saved) experience = { sound:saved.sound === true, effects:saved.effects !== false }; } catch {}
  updatePreferences();
  document.querySelector("#soundButton").addEventListener("click",()=>{
    experience.sound = !experience.sound; savePreferences(); updatePreferences(); if(experience.sound) playSound();
  });
  document.querySelector("#effectsButton").addEventListener("click",()=>{
    experience.effects = !experience.effects; savePreferences(); updatePreferences();
  });
  document.querySelector("#exportButton").addEventListener("click",downloadBackup);
  const input = document.querySelector("#importInput");
  document.querySelector("#importButton").addEventListener("click",()=>input.click());
  input.addEventListener("change",async ()=> { await importBackup(input.files[0]); input.value=""; });
  const dialog=document.querySelector("#recapDialog");
  document.querySelector("#recapClose").addEventListener("click",()=>dialog.close());
  dialog.addEventListener("close",()=>{
    cancelAnimationFrame(confettiFrame);
    const canvas=document.querySelector("#confettiCanvas"); canvas.getContext("2d")?.clearRect(0,0,canvas.width,canvas.height);
    const game=getActiveGame();
    if(game && game.status === "active" && getRoundNumber(game)<=getMaxRounds(game)) entryGrid.querySelector("input")?.focus();
  });
}

initializeExperience();
loadGames();
showHome();
