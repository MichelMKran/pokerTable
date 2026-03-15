const MONTE_CARLO_ITERS = 50000;

const RANKS="23456789TJQKA";
const SUITS="shdc";
const SUIT_SYMBOLS={s:"♠",h:"♥",d:"♦",c:"♣"};

let players=[];
let board=[];
let deck=[];

let numPlayers=6;
let dealerIndex=0;

const svg=document.getElementById("pokerTable");
const equityBody=document.querySelector("#equityTable tbody");

function buildDeck(exclude=[]){
  const d=[];
  for(let r of RANKS)
  for(let s of SUITS){
    const c=r+s;
    if(!exclude.includes(c)) d.push(c);
  }
  return d;
}

function shuffle(a){
  for(let i=a.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
}

function rankVal(r){
  return RANKS.indexOf(r);
}

function evaluate7(cards){

  const rs=cards.map(c=>rankVal(c[0])).sort((a,b)=>b-a);
  const ss=cards.map(c=>c[1]);

  const count={};
  rs.forEach(r=>count[r]=(count[r]||0)+1);

  const groups=Object.entries(count)
  .map(([r,c])=>({r:+r,c}))
  .sort((a,b)=>b.c-a.c||b.r-a.r);

  function straight(arr){
    const u=[...new Set(arr)];
    if(u[0]===12)u.push(-1);
    for(let i=0;i<=u.length-5;i++)
      if(u[i]-u[i+4]===4)return u[i];
    return null;
  }

  let flushSuit=null;
  for(let s of SUITS)
    if(ss.filter(x=>x===s).length>=5)flushSuit=s;

  if(flushSuit){
    const fr=cards.filter(c=>c[1]===flushSuit)
    .map(c=>rankVal(c[0])).sort((a,b)=>b-a);
    const sf=straight(fr);
    if(sf!==null)return 9e6+sf;
  }

  if(groups[0].c===4)return 8e6+groups[0].r;
  if(groups[0].c===3&&groups[1].c>=2)return 7e6+groups[0].r;
  if(flushSuit)return 6e6;
  const st=straight(rs);
  if(st!==null)return 5e6+st;
  if(groups[0].c===3)return 4e6+groups[0].r;
  if(groups[0].c===2&&groups[1].c===2)return 3e6;
  if(groups[0].c===2)return 2e6;

  return rs[0];
}

function runEquity(){

  const wins=Array(numPlayers).fill(0);
  const known=[...board,...players.flat()];

  if(board.length===5){

    const scores=players.map(p=>evaluate7([...p,...board]));
    const max=Math.max(...scores);
    const winners=scores.filter(s=>s===max).length;

    updateTable(scores.map(s=>s===max?100/winners:0));
    return;
  }

  for(let i=0;i<MONTE_CARLO_ITERS;i++){

    const d=buildDeck(known);
    shuffle(d);

    const b=[...board];
    while(b.length<5)b.push(d.pop());

    const scores=players.map(p=>evaluate7([...p,...b]));
    const max=Math.max(...scores);
    const winners=scores.filter(s=>s===max).length;

    scores.forEach((s,i)=>{
      if(s===max)wins[i]+=1/winners;
    });
  }

  updateTable(wins.map(w=>w/MONTE_CARLO_ITERS*100));
}

function updateTable(eq){

  equityBody.innerHTML="";

  players.forEach((p,i)=>{

    const tr=document.createElement("tr");

    tr.innerHTML=`
    <td>P${i}</td>
    <td>${p.map(c=>c[0]+SUIT_SYMBOLS[c[1]]).join(" ")}</td>
    <td>${eq?eq[i].toFixed(1)+"%":"--"}</td>
    <td>${Game.playersData[i].stack}</td>
    `;

    equityBody.appendChild(tr);
  });
}

function drawText(x,y,text,size,color="#fff"){
  const t=document.createElementNS("http://www.w3.org/2000/svg","text");
  t.setAttribute("x",x);
  t.setAttribute("y",y);
  t.setAttribute("text-anchor","middle");
  t.setAttribute("dominant-baseline","middle");
  t.setAttribute("font-size",size);
  t.setAttribute("fill",color);
  t.textContent=text;
  svg.appendChild(t);
}

function drawSeat(x,y){

  const c=document.createElementNS("http://www.w3.org/2000/svg","circle");

  c.setAttribute("cx",x);
  c.setAttribute("cy",y);
  c.setAttribute("r",32);
  c.setAttribute("fill","#444");
  c.setAttribute("stroke","#fff");

  svg.appendChild(c);
}

function drawDealer(x,y){

  const r=16;

  const c=document.createElementNS("http://www.w3.org/2000/svg","circle");

  c.setAttribute("cx",x+48);
  c.setAttribute("cy",y);
  c.setAttribute("r",r);
  c.setAttribute("fill","#fff");

  svg.appendChild(c);

  drawText(x+48,y,"D",14,"black");
}

function drawCard(x,y,c){

  const r=document.createElementNS("http://www.w3.org/2000/svg","rect");

  r.setAttribute("x",x);
  r.setAttribute("y",y);
  r.setAttribute("width",40);
  r.setAttribute("height",60);
  r.setAttribute("rx",6);
  r.setAttribute("fill","#fff");

  svg.appendChild(r);

  drawText(
  x+20,
  y+32,
  c[0]+SUIT_SYMBOLS[c[1]],
  15,
  ["h","d"].includes(c[1])?"red":"black"
  );
}

function getPositions(n,dealer){

  const map={
  2:["BTN/SB","BB"],
  3:["BTN","SB","BB"],
  4:["BTN","SB","BB","UTG"],
  5:["BTN","SB","BB","UTG","CO"],
  6:["BTN","SB","BB","UTG","HJ","CO"],
  7:["BTN","SB","BB","UTG","UTG+1","HJ","CO"],
  8:["BTN","SB","BB","UTG","UTG+1","LJ","HJ","CO"],
  9:["BTN","SB","BB","UTG","UTG+1","UTG+2","LJ","HJ","CO"],
  10:["BTN","SB","BB","UTG","UTG+1","UTG+2","UTG+3","LJ","HJ","CO"]
  };

  const base=map[n];
  const result={};

  for(let i=0;i<n;i++)
    result[(dealer+i)%n]=base[i];

  return result;
}

function drawAll(){

  svg.innerHTML="";

  const cx=450;
  const cy=300;

  const pos=getPositions(numPlayers,dealerIndex);

  board.forEach((c,i)=>drawCard(cx-110+i*55,cy-30,c));

  players.forEach((p,i)=>{

    const angle=i/numPlayers*2*Math.PI-Math.PI/2;

    const x=cx+330*Math.cos(angle);
    const y=cy+190*Math.sin(angle);

    drawSeat(x,y);

    drawText(x,y-6,"P"+i,13);
    drawText(x,y+12,pos[i],11);

    if(i===dealerIndex)drawDealer(x,y);

    p.forEach((c,j)=>drawCard(x-28+j*32,y+36,c));
  });
}

const Game={

playersData:[],
pot:0,
currentBet:0,
minRaise:0,
street:"",

blinds:[
{sb:10,bb:20},
{sb:20,bb:40},
{sb:40,bb:80},
{sb:80,bb:160}
],

blindLevel:0,

initPlayers(){

numPlayers=Number(document.getElementById("players").value);
dealerIndex=Number(document.getElementById("dealer").value)%numPlayers;

players=[];
board=[];

for(let i=0;i<numPlayers;i++)
players.push([]);

this.playersData=[];

for(let i=0;i<numPlayers;i++)
this.playersData.push({
stack:2000,
bet:0,
folded:false
});

},

startHand(){

this.initPlayers();

deck=buildDeck();
shuffle(deck);

this.postBlinds();

let pos=(dealerIndex+1)%numPlayers;

for(let r=0;r<2;r++)
for(let i=0;i<numPlayers;i++){
players[pos].push(deck.pop());
pos=(pos+1)%numPlayers;
}

this.street="preflop";

drawAll();
runEquity();
updateTable();

},

postBlinds(){

const {sb,bb}=this.blinds[this.blindLevel];

const sbSeat=(dealerIndex+1)%numPlayers;
const bbSeat=(dealerIndex+2)%numPlayers;

this.bet(sbSeat,sb);
this.bet(bbSeat,bb);

this.currentBet=bb;
this.minRaise=bb;

},

bet(seat,amount){

const p=this.playersData[seat];

const a=Math.min(amount,p.stack);

p.stack-=a;
p.bet+=a;
this.pot+=a;

},

check(){alert("check");},
call(){alert("call");},
fold(){alert("fold");},

raisePrompt(){

const amt=Number(prompt("Raise amount"));

if(!amt)return;

alert("raise "+amt);

}

};