// =====================================================
// CONFIG
// =====================================================
const MONTE_CARLO_ITERS = 15000;
const MAX_PLAYERS = 10;

const RANKS = "23456789TJQKA";
const SUITS = "shdc";
const SUIT_SYMBOLS = { s:"♠", h:"♥", d:"♦", c:"♣" };

// =====================================================
// STATE
// =====================================================
let numPlayers = 6;
let dealerIndex = 0;
let players = [];
let board = [];
let deck = [];

// =====================================================
// DOM
// =====================================================
const svg = document.getElementById("pokerTable");
const equityBody = document.querySelector("#equityTable tbody");

document.getElementById("dealHoleBtn").onclick = dealHole;
document.getElementById("dealFlopBtn").onclick = dealFlop;
document.getElementById("dealTurnBtn").onclick = dealTurn;
document.getElementById("dealRiverBtn").onclick = dealRiver;

// =====================================================
// CARD / DECK
// =====================================================
function rankVal(r){ return RANKS.indexOf(r); }

function buildDeck(exclude = []) {
  const d = [];
  for (let r of RANKS)
    for (let s of SUITS) {
      const c = r + s;
      if (!exclude.includes(c)) d.push(c);
    }
  return d;
}

function shuffle(a){
  for (let i=a.length-1;i>0;i--) {
    const j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
}

// =====================================================
// DEALING
// =====================================================
function dealHole(){
  numPlayers = Number(document.getElementById("players").value);
  dealerIndex = Number(document.getElementById("dealer").value) % numPlayers;

  players = Array.from({length:numPlayers},()=>[]);
  board = [];

  deck = buildDeck();
  shuffle(deck);

  let p = (dealerIndex + 1) % numPlayers;
  for (let r=0;r<2;r++){
    for (let i=0;i<numPlayers;i++){
      players[p].push(deck.pop());
      p = (p+1)%numPlayers;
    }
  }

  drawAll();
  runEquity();
}

function dealFlop(){
  if (board.length !== 0) return;
  deck.pop();
  board.push(deck.pop(), deck.pop(), deck.pop());
  drawAll();
  runEquity();
}

function dealTurn(){
  if (board.length !== 3) return;
  deck.pop();
  board.push(deck.pop());
  drawAll();
  runEquity();
}

function dealRiver(){
  if (board.length !== 4) return;
  deck.pop();
  board.push(deck.pop());
  drawAll();
  runEquity();
}

// =====================================================
// HAND EVALUATOR (7-CARD)
// =====================================================
function evaluate7(cards) {
  const rs = cards.map(c=>rankVal(c[0])).sort((a,b)=>b-a);
  const ss = cards.map(c=>c[1]);

  const count = {};
  rs.forEach(r=>count[r]=(count[r]||0)+1);

  const groups = Object.entries(count)
    .map(([r,c])=>({r:+r,c}))
    .sort((a,b)=>b.c-a.c || b.r-a.r);

  function straight(arr){
    const u=[...new Set(arr)];
    if (u[0]===12) u.push(-1);
    for(let i=0;i<=u.length-5;i++)
      if(u[i]-u[i+4]===4) return u[i];
    return null;
  }

  let flushSuit=null;
  for(let s of SUITS)
    if(ss.filter(x=>x===s).length>=5) flushSuit=s;

  if(flushSuit){
    const fr=cards.filter(c=>c[1]===flushSuit)
      .map(c=>rankVal(c[0])).sort((a,b)=>b-a);
    const sf=straight(fr);
    if(sf!==null) return 9e6+sf;
  }

  if(groups[0].c===4) return 8e6+groups[0].r*100+groups[1].r;
  if(groups[0].c===3 && groups[1].c>=2)
    return 7e6+groups[0].r*100+groups[1].r;
  if(flushSuit) return 6e6+rs.slice(0,5).reduce((a,b,i)=>a+b*15**(4-i),0);
  const st=straight(rs);
  if(st!==null) return 5e6+st;
  if(groups[0].c===3)
    return 4e6+groups[0].r*225+groups[1].r*15+groups[2].r;
  if(groups[0].c===2 && groups[1].c===2)
    return 3e6+groups[0].r*225+groups[1].r*15+groups[2].r;
  if(groups[0].c===2)
    return 2e6+groups[0].r*3375+groups[1].r*225+groups[2].r*15+groups[3].r;
  return rs.slice(0,5).reduce((a,b,i)=>a+b*15**(4-i),0);
}

// =====================================================
// EQUITY ENGINE
// =====================================================
function runEquity(){
  const wins = Array(numPlayers).fill(0);
  const known = [...board, ...players.flat()];

  // RIVER → exact
  if(board.length===5){
    const scores = players.map(p=>evaluate7([...p,...board]));
    const max = Math.max(...scores);
    const n = scores.filter(s=>s===max).length;
    scores.forEach((s,i)=>wins[i]=s===max?100/n:0);
    updateTable(wins);
    return;
  }

  // Monte Carlo
  for(let i=0;i<MONTE_CARLO_ITERS;i++){
    const d = buildDeck(known);
    shuffle(d);
    const b=[...board];
    while(b.length<5) b.push(d.pop());

    const scores = players.map(p=>evaluate7([...p,...b]));
    const max = Math.max(...scores);
    const n = scores.filter(s=>s===max).length;
    scores.forEach((s,i)=>{ if(s===max) wins[i]+=1/n; });
  }

  updateTable(wins.map(w=>w/MONTE_CARLO_ITERS*100));
}

// =====================================================
// UI
// =====================================================
function updateTable(eq){
  equityBody.innerHTML="";
  players.forEach((p,i)=>{
    const tr=document.createElement("tr");
    tr.innerHTML=`
      <td>P${i}</td>
      <td>${p.map(c=>c[0]+SUIT_SYMBOLS[c[1]]).join(" ")}</td>
      <td>${eq[i].toFixed(1)}%</td>
    `;
    equityBody.appendChild(tr);
  });
}

function drawSeat(x, y, isDealer) {
  const c = document.createElementNS("http://www.w3.org/2000/svg","circle");
  c.setAttribute("cx", x);
  c.setAttribute("cy", y);
  c.setAttribute("r", 22);
  c.setAttribute("fill", isDealer ? "gold" : "#444");
  c.setAttribute("stroke", "#fff");
  c.setAttribute("stroke-width", 2);
  svg.appendChild(c);
}

function drawPlayerLabel(x, y, text) {
  const t = document.createElementNS("http://www.w3.org/2000/svg","text");
  t.setAttribute("x", x);
  t.setAttribute("y", y);
  t.setAttribute("text-anchor", "middle");
  t.setAttribute("dominant-baseline", "middle");
  t.setAttribute("fill", "#fff");
  t.setAttribute("font-size", "13");
  t.textContent = text;
  svg.appendChild(t);
}


function drawAll(){
  svg.innerHTML="";
  const w=900,h=600,cx=w/2,cy=h/2;
  svg.setAttribute("width",w);
  svg.setAttribute("height",h);

  const table=document.createElementNS("http://www.w3.org/2000/svg","ellipse");
  table.setAttribute("cx",cx);
  table.setAttribute("cy",cy);
  table.setAttribute("rx",350);
  table.setAttribute("ry",200);
  table.setAttribute("fill","#0b5133");
  svg.appendChild(table);

  board.forEach((c,i)=>{
    drawCard(cx-100+i*50,cy-30,c);
  });

players.forEach((p,i)=>{
  const a = i / numPlayers * 2 * Math.PI - Math.PI / 2;
  const x = cx + 320 * Math.cos(a);
  const y = cy + 180 * Math.sin(a);

  // seat + dealer highlight
  drawSeat(x, y, i === dealerIndex);

  // player label inside seat
  drawPlayerLabel(x, y, `P${i}`);

  // hole cards below seat
  p.forEach((c,j)=>{
    drawCard(x - 25 + j * 30, y + 28, c);
  });
});
}

function drawCard(x,y,c){
  const r=document.createElementNS("http://www.w3.org/2000/svg","rect");
  r.setAttribute("x",x);
  r.setAttribute("y",y);
  r.setAttribute("width",40);
  r.setAttribute("height",60);
  r.setAttribute("fill","#fff");
  r.setAttribute("rx",5);
  svg.appendChild(r);

  const t=document.createElementNS("http://www.w3.org/2000/svg","text");
  t.setAttribute("x",x+20);
  t.setAttribute("y",y+35);
  t.setAttribute("text-anchor","middle");
  t.setAttribute("fill",["h","d"].includes(c[1])?"red":"black");
  t.textContent=c[0]+SUIT_SYMBOLS[c[1]];
  svg.appendChild(t);
}
