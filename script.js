// ====== Setup ======
const suits = ["♠","♥","♦","♣"];
const suitsShort = ["s","h","d","c"];
const ranks = ["2","3","4","5","6","7","8","9","T","J","Q","K","A"];

let numPlayers = 6;
let dealerIndex = 0;
let deck = [];
let players = [];
let board = [];

const playersInput = document.getElementById("players");
const dealerInput = document.getElementById("dealer");
const svg = document.getElementById("pokerTable");

const cardWidth = 40;
const cardHeight = 60;
const seatRadius = 25;
const MONTE_CARLO_ITERS = 5000; // adjust for accuracy/speed

// ====== Buttons ======
document.getElementById("dealHoleBtn").addEventListener("click", dealHoleCards);
document.getElementById("dealFlopBtn").addEventListener("click", dealFlop);
document.getElementById("dealTurnBtn").addEventListener("click", dealTurn);
document.getElementById("dealRiverBtn").addEventListener("click", dealRiver);

// ====== Deck Utils ======
function createDeck() {
  const d = [];
  for(let s=0;s<4;s++){
    for(let r of ranks){
      d.push({symbol:r+suits[s], solver:r+suitsShort[s]});
    }
  }
  return d;
}

function shuffle(d){
  for(let i=d.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [d[i],d[j]]=[d[j],d[i]];
  }
}

function getCardColor(card){ return (/♥|♦/.test(card.symbol))?"red":"black"; }

// ====== Deal Functions ======
function dealHoleCards(){
  numPlayers = Number(playersInput.value);
  dealerIndex = Number(dealerInput.value) % numPlayers;

  deck = createDeck();
  shuffle(deck);

  players = Array.from({length:numPlayers},()=>[]);
  board = [];

  let pos = (dealerIndex+1)%numPlayers;
  for(let round=0;round<2;round++){
    for(let i=0;i<numPlayers;i++){
      players[pos].push(deck.pop());
      pos=(pos+1)%numPlayers;
    }
  }

  renderAll();
}

function dealFlop(){
  if(board.length>0) return;
  deck.pop(); // burn
  board.push(deck.pop(),deck.pop(),deck.pop());
  renderAll();
}

function dealTurn(){
  if(board.length!==3) return;
  deck.pop(); // burn
  board.push(deck.pop());
  renderAll();
}

function dealRiver(){
  if(board.length!==4) return;
  deck.pop(); // burn
  board.push(deck.pop());
  renderAll();
}

// ====== Draw Table ======
function drawTable(){
  svg.innerHTML="";
  const width=900,height=600;
  svg.setAttribute("width",width);
  svg.setAttribute("height",height);

  const cx = width/2, cy=height/2;
  const rx = Math.max(300,numPlayers*35), ry = Math.max(150,numPlayers*20);

  const tableEllipse=document.createElementNS("http://www.w3.org/2000/svg","ellipse");
  tableEllipse.setAttribute("cx",cx);
  tableEllipse.setAttribute("cy",cy);
  tableEllipse.setAttribute("rx",rx);
  tableEllipse.setAttribute("ry",ry);
  tableEllipse.setAttribute("fill","#0b5133");
  tableEllipse.setAttribute("stroke","#fff");
  tableEllipse.setAttribute("stroke-width","4");
  svg.appendChild(tableEllipse);

  // Board cards
  board.forEach((c,i)=>{
    const spacing=cardWidth+10;
    const x=cx-(board.length*spacing)/2+i*spacing+5;
    const y=cy-cardHeight/2;
    appendCardSVG(x,y,c);
  });

  // Player seats
  players.forEach((cards,i)=>{
    const angle=(i/numPlayers)*2*Math.PI-Math.PI/2;
    const x=cx+rx*Math.cos(angle);
    const y=cy+ry*Math.sin(angle);

    appendSeatSVG(x,y, i===dealerIndex);
    appendLabelSVG(x,y, `P${i}`);

    const holeSpacing=(numPlayers>=8?cardWidth+10:cardWidth+5);
    const totalWidth=holeSpacing*cards.length-(holeSpacing-cardWidth);
    const startX=x-totalWidth/2;
    cards.forEach((card,j)=>appendCardSVG(startX+j*holeSpacing, y+seatRadius+5, card));
  });
}

function appendCardSVG(x,y,card){
  const rect=document.createElementNS("http://www.w3.org/2000/svg","rect");
  rect.setAttribute("x",x);
  rect.setAttribute("y",y);
  rect.setAttribute("width",cardWidth);
  rect.setAttribute("height",cardHeight);
  rect.setAttribute("fill","#fff");
  rect.setAttribute("stroke","#000");
  rect.setAttribute("rx",5);
  rect.setAttribute("ry",5);
  svg.appendChild(rect);

  const text=document.createElementNS("http://www.w3.org/2000/svg","text");
  text.setAttribute("x",x+cardWidth/2);
  text.setAttribute("y",y+cardHeight/2+5);
  text.setAttribute("text-anchor","middle");
  text.setAttribute("fill",getCardColor(card));
  text.textContent=card.symbol;
  text.setAttribute("font-size","14");
  svg.appendChild(text);
}

function appendSeatSVG(x,y,isDealer){
  const circle=document.createElementNS("http://www.w3.org/2000/svg","circle");
  circle.setAttribute("cx",x);
  circle.setAttribute("cy",y);
  circle.setAttribute("r",seatRadius);
  circle.setAttribute("fill",isDealer?"gold":"#444");
  circle.setAttribute("stroke","#fff");
  svg.appendChild(circle);
}

function appendLabelSVG(x,y,textStr){
  const text=document.createElementNS("http://www.w3.org/2000/svg","text");
  text.setAttribute("x",x);
  text.setAttribute("y",y);
  text.setAttribute("text-anchor","middle");
  text.setAttribute("dominant-baseline","middle");
  text.setAttribute("fill","#fff");
  text.textContent=textStr;
  text.setAttribute("font-size","14");
  svg.appendChild(text);
}

// ====== Equity Table ======
function fillEquityTablePlaceholders(){
  const tbody=document.querySelector("#equityTable tbody");
  tbody.innerHTML="";
  players.forEach((cards,i)=>{
    const tr=document.createElement("tr");
    tr.innerHTML=`<td>P${i}</td><td>${cards.map(c=>c.symbol).join(" ")}</td><td>--</td>`;
    tbody.appendChild(tr);
  });
}

function updateEquityTable(equities){
  const tbody=document.querySelector("#equityTable tbody");
  tbody.innerHTML="";
  players.forEach((cards,i)=>{
    const tr=document.createElement("tr");
    tr.innerHTML=`<td>P${i}</td><td>${cards.map(c=>c.symbol).join(" ")}</td><td>${equities[i].toFixed(1)}%</td>`;
    tbody.appendChild(tr);
  });
}

// ====== Monte Carlo Equity ======
function monteCarloEquity(iters=MONTE_CARLO_ITERS){
  const wins=Array(numPlayers).fill(0);
  const ties=Array(numPlayers).fill(0);

  const known=players.flat().map(c=>c.solver).concat(board.map(c=>c.solver));

  for(let it=0; it<iters; it++){
    // create remaining deck
    let deckSim = createDeck().filter(c=>!known.includes(c.solver));
    shuffle(deckSim);

    // simulate board
    const simBoard=[...board];
    while(simBoard.length<5) simBoard.push(deckSim.pop());

    // evaluate hands
    const scores = players.map(ph=>{
      const cardsStr = ph.map(c=>c.solver).concat(simBoard.map(c=>c.solver));
      const hand = PokerEvaluator.evalHand(cardsStr);
      return hand.value;
    });

    const minScore = Math.min(...scores);
    const winners = [];
    scores.forEach((v,i)=>{ if(v===minScore) winners.push(i); });

    winners.forEach(w=>{
      if(winners.length===1) wins[w]++;
      else ties[w]++;
    });
  }

  return wins.map((w,i)=>(w + ties[i]/numPlayers)/iters*100);
}

// ====== Render All ======
function renderAll(){
  drawTable();
  fillEquityTablePlaceholders();

  if(board.length<5){
    setTimeout(()=>{
      const equities = monteCarloEquity();
      updateEquityTable(equities);
    },10);
  } else {
    // river winner 100%/0%
    const scores = players.map(ph=>{
      const cardsStr = ph.map(c=>c.solver).concat(board.map(c=>c.solver));
      const hand = PokerEvaluator.evalHand(cardsStr);
      return hand.value;
    });
    const minScore = Math.min(...scores);
    const winnerIndex = scores.findIndex(v=>v===minScore);
    updateEquityTable(players.map((_,i)=>i===winnerIndex?100:0));
  }
}

// ====== Initial Deal ======
dealHoleCards();
