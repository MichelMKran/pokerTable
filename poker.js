/****************************************************************
 COMPLETE POKER ENGINE + TABLE
****************************************************************/

const MAX_PLAYERS = 9;
const STARTING_STACK = 2000;

const BLIND_LEVELS = [
  {sb:10, bb:20},
  {sb:15, bb:30},
  {sb:25, bb:50},
  {sb:50, bb:100},
];

let blindIndex = 0;
let blindTimer = 11 * 60;

/**********************
 GAME STATE
**********************/
const game = {
  players: [],
  dealer: 0,
  turn: 0,
  pot: 0,
  currentBet: 0,
  street: "Preflop",
  board: [],
};

/**********************
 CREATE PLAYERS
**********************/
for(let i=0;i<9;i++){
  game.players.push({
    id:i+1,
    name:`Player ${i+1}`,
    stack:STARTING_STACK,
    bet:0,
    folded:false,
    acted:false
  });
}

/**********************
 POSITIONS
**********************/
function getPositions(n, dealer){

  const base = [
    "BTN","SB","BB",
    "UTG","UTG+1","UTG+2","LJ","HJ","CO"
  ];

  let used = base.slice(0,n);

  const ordered = [];
  for(let i=0;i<n;i++)
    ordered.push(used[(i-dealer+n)%n]);

  return ordered;
}

/**********************
 TABLE RENDER
**********************/
function renderTable(){

  const table=document.getElementById("table");
  table.innerHTML="";

  const n=game.players.length;
  const radius=280;
  const cx=450;
  const cy=325;

  const positions=getPositions(n,game.dealer);

  game.players.forEach((p,i)=>{

    const angle=(i/n)*2*Math.PI-Math.PI/2;
    const x=cx+radius*Math.cos(angle)-60;
    const y=cy+radius*Math.sin(angle)-40;

    const seat=document.createElement("div");
    seat.className="seat";
    seat.style.left=x+"px";
    seat.style.top=y+"px";

    seat.innerHTML=`
      <div class="player">
        ${p.name}<br>
        Stack: ${p.stack}<br>
        Bet: ${p.bet}
      </div>
      <div class="position">${positions[i]}</div>
    `;

    // dealer button
    if(i===game.dealer){
      const btn=document.createElement("div");
      btn.className="dealer";
      btn.innerText="D";
      btn.style.left="70px";
      btn.style.top="40px";
      seat.appendChild(btn);
    }

    table.appendChild(seat);
  });

  document.getElementById("pot").innerText=game.pot;
  document.getElementById("street").innerText=game.street;

  const blinds=BLIND_LEVELS[blindIndex];
  document.getElementById("blinds").innerText=
    `${blinds.sb} / ${blinds.bb}`;
}

/**********************
 BETTING LOGIC
**********************/
function nextPlayer(){

  let i=game.turn;

  do{
    i=(i+1)%game.players.length;
  }while(game.players[i].folded);

  game.turn=i;
}

function everyoneActed(){
  return game.players
    .filter(p=>!p.folded)
    .every(p=>p.acted && p.bet===game.currentBet);
}

/**********************
 ACTIONS
**********************/
function action(type){

  const p=game.players[game.turn];
  const blinds=BLIND_LEVELS[blindIndex];

  if(p.folded) return;

  switch(type){

    case "fold":
      p.folded=true;
      break;

    case "check":
      if(game.currentBet!==p.bet) return;
      break;

    case "call":{
      const diff=game.currentBet-p.bet;
      betChips(p,diff);
      break;
    }

    case "bet":{
      if(game.currentBet!==0) return;
      const amount=blinds.bb;
      game.currentBet=amount;
      betChips(p,amount);
      resetActs(p);
      break;
    }

    case "raise":{
      const minRaise=blinds.bb;
      const newBet=game.currentBet+minRaise;
      const diff=newBet-p.bet;

      game.currentBet=newBet;
      betChips(p,diff);
      resetActs(p);
      break;
    }
  }

  p.acted=true;

  if(checkWinner()) return;

  if(everyoneActed()){
    nextStreet();
  }else{
    nextPlayer();
  }

  renderTable();
}

function betChips(player,amount){
  amount=Math.min(amount,player.stack);
  player.stack-=amount;
  player.bet+=amount;
  game.pot+=amount;
}

function resetActs(except){
  game.players.forEach(p=>{
    if(p!==except) p.acted=false;
  });
}

/**********************
 STREET FLOW
**********************/
function nextStreet(){

  game.players.forEach(p=>{
    p.bet=0;
    p.acted=false;
  });

  game.currentBet=0;

  if(game.street==="Preflop") game.street="Flop";
  else if(game.street==="Flop") game.street="Turn";
  else if(game.street==="Turn") game.street="River";
  else showdown();

  game.turn=(game.dealer+1)%game.players.length;
}

function showdown(){
  alert("Showdown (equity engine placeholder)");
  newHand();
}

/**********************
 WIN CHECK
**********************/
function checkWinner(){
  const alive=game.players.filter(p=>!p.folded);
  if(alive.length===1){
    alive[0].stack+=game.pot;
    alert(`${alive[0].name} wins ${game.pot}`);
    newHand();
    return true;
  }
  return false;
}

/**********************
 NEW HAND
**********************/
function newHand(){

  game.dealer=(game.dealer+1)%game.players.length;
  game.street="Preflop";
  game.pot=0;
  game.currentBet=0;

  game.players.forEach(p=>{
    p.bet=0;
    p.folded=false;
    p.acted=false;
  });

  postBlinds();
  renderTable();
}

function postBlinds(){

  const blinds=BLIND_LEVELS[blindIndex];
  const sb=(game.dealer+1)%game.players.length;
  const bb=(game.dealer+2)%game.players.length;

  betChips(game.players[sb],blinds.sb);
  betChips(game.players[bb],blinds.bb);

  game.currentBet=blinds.bb;
  game.turn=(bb+1)%game.players.length;
}

/**********************
 BLIND TIMER
**********************/
setInterval(()=>{
  blindTimer--;

  if(blindTimer<=0){
    blindIndex=Math.min(
      blindIndex+1,
      BLIND_LEVELS.length-1
    );
    blindTimer=11*60;
  }

  const m=Math.floor(blindTimer/60);
  const s=blindTimer%60;

  document.getElementById("timer").innerText=
    `${m}:${s.toString().padStart(2,'0')}`;

},1000);

/**********************
 START
**********************/
postBlinds();
renderTable();