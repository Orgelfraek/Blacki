import React, { useState, useCallback } from 'react';
import { Users, Crosshair, RotateCcw, ChevronRight, Star, History, Info, SplitSquareHorizontal, Skull, Badge, Coins } from 'lucide-react';

// --- Types ---
type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

interface Card {
  id: string;
  suit: Suit;
  rank: Rank;
  isFaceUp: boolean;
}

interface Player {
  id: string;
  name: string;
  hand: Card[];
  status: 'playing' | 'stand' | 'bust' | 'blackjack' | 'waiting';
  score: number;
}

type GamePhase = 'setup' | 'dealing' | 'action' | 'dealer' | 'payout';

// --- Constants ---
const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

// --- Helpers ---
const getSuitSymbol = (suit: Suit) => {
  switch (suit) {
    case 'hearts': return '♥';
    case 'diamonds': return '♦';
    case 'clubs': return '♣';
    case 'spades': return '♠';
  }
};

const getSuitColor = (suit: Suit) => {
  return (suit === 'hearts' || suit === 'diamonds') ? 'text-[var(--color-crimson)]' : 'text-[var(--color-ink)]';
};

const calculateScore = (hand: Card[]): number => {
  let score = 0;
  let aces = 0;
  hand.forEach(card => {
    if (!card.isFaceUp) return;
    if (card.rank === 'A') {
      aces += 1;
      score += 11;
    } else if (['J', 'Q', 'K'].includes(card.rank)) {
      score += 10;
    } else {
      score += parseInt(card.rank);
    }
  });
  while (score > 21 && aces > 0) {
    score -= 10;
    aces -= 1;
  }
  return score;
};

// --- Main App ---
export default function App() {
  const [phase, setPhase] = useState<GamePhase>('setup');
  const [players, setPlayers] = useState<Player[]>([]);
  const [activePlayerIdx, setActivePlayerIdx] = useState(0);
  const [dealer, setDealer] = useState<{ hand: Card[]; score: number }>({ hand: [], score: 0 });
  const [deck, setDeck] = useState<Card[]>([]);
  const [message, setMessage] = useState<string>('');
  const [setupConfig, setSetupConfig] = useState<{ count: number; names: string[] }>({
    count: 2,
    names: ['Outlaw 1', 'Outlaw 2', 'Outlaw 3', 'Outlaw 4'],
  });

  // --- Logic ---
  const createDeck = useCallback((deckCount = 6) => {
    const newDeck: Card[] = [];
    for (let d = 0; d < deckCount; d++) {
      SUITS.forEach(suit => {
        RANKS.forEach(rank => {
          newDeck.push({
            id: `${d}-${suit}-${rank}-${Math.random()}`,
            suit,
            rank,
            isFaceUp: false,
          });
        });
      });
    }
    for (let i = newDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
    }
    return newDeck;
  }, []);

  const initGame = () => {
    const initialPlayers: Player[] = Array.from({ length: setupConfig.count }).map((_, i) => ({
      id: String(i),
      name: setupConfig.names[i] || `Outlaw ${i + 1}`,
      hand: [],
      status: 'playing',
      score: 0,
    }));
    const newDeck = createDeck();
    startDealing(initialPlayers, newDeck);
  };

  const startDealing = (currentPlayers: Player[], currentDeck: Card[]) => {
    setPhase('dealing');
    const newDeck = [...currentDeck];
    const newPlayers = currentPlayers.map(p => ({ ...p, hand: [], status: 'playing' as const, score: 0 }));
    let newDealerHand: Card[] = [];

    // Deal sequence
    for (let i = 0; i < newPlayers.length; i++) newPlayers[i].hand.push({ ...newDeck.pop()!, isFaceUp: true });
    newDealerHand.push({ ...newDeck.pop()!, isFaceUp: false }); // Hole card
    for (let i = 0; i < newPlayers.length; i++) {
        newPlayers[i].hand.push({ ...newDeck.pop()!, isFaceUp: true });
        newPlayers[i].score = calculateScore(newPlayers[i].hand);
        if (newPlayers[i].score === 21) newPlayers[i].status = 'blackjack';
    }
    newDealerHand.push({ ...newDeck.pop()!, isFaceUp: true });

    setDeck(newDeck);
    setPlayers(newPlayers);
    setDealer({ hand: newDealerHand, score: calculateScore(newDealerHand) });
    
    setTimeout(() => {
      setPhase('action');
      findNextActive(0, newPlayers);
    }, 1500); // Shorter dealing wait
  };

  const findNextActive = (currentIdx: number, currentPlayers: Player[]) => {
    let nextIdx = currentIdx;
    while (nextIdx < currentPlayers.length && currentPlayers[nextIdx].status !== 'playing') {
      nextIdx++;
    }
    if (nextIdx >= currentPlayers.length) {
      startDealerTurn();
    } else {
      setActivePlayerIdx(nextIdx);
    }
  };

  const handleHit = () => {
    const newDeck = [...deck];
    const newPlayers = [...players];
    const card = newDeck.pop()!;
    newPlayers[activePlayerIdx].hand.push({ ...card, isFaceUp: true });
    const score = calculateScore(newPlayers[activePlayerIdx].hand);
    newPlayers[activePlayerIdx].score = score;

    if (score > 21) {
      newPlayers[activePlayerIdx].status = 'bust';
      setDeck(newDeck);
      setPlayers(newPlayers);
      setTimeout(() => findNextActive(activePlayerIdx, newPlayers), 600);
    } else if (score === 21) {
      newPlayers[activePlayerIdx].status = 'stand';
      setDeck(newDeck);
      setPlayers(newPlayers);
      setTimeout(() => findNextActive(activePlayerIdx, newPlayers), 600);
    } else {
      setDeck(newDeck);
      setPlayers(newPlayers);
    }
  };

  const handleStand = () => {
    const newPlayers = [...players];
    newPlayers[activePlayerIdx].status = 'stand';
    setPlayers(newPlayers);
    findNextActive(activePlayerIdx, newPlayers);
  };

  const handleDoubleDown = () => {
    const newDeck = [...deck];
    const newPlayers = [...players];
    const player = newPlayers[activePlayerIdx];
    
    const card = newDeck.pop()!;
    player.hand.push({ ...card, isFaceUp: true });
    const score = calculateScore(player.hand);
    player.score = score;
    
    if (score > 21) player.status = 'bust';
    else player.status = 'stand';
    
    setDeck(newDeck);
    setPlayers(newPlayers);
    setTimeout(() => findNextActive(activePlayerIdx, newPlayers), 600);
  };

  const handleSplit = () => {
    const newDeck = [...deck];
    const newPlayers = [...players];
    const p = newPlayers[activePlayerIdx];
    
    if (p.hand.length !== 2 || p.hand[0].rank !== p.hand[1].rank) return;

    const c1 = p.hand[0];
    const c2 = p.hand[1];
    const baseName = p.name.replace(/ \(Split \d+\)$/, '');

    p.name = `${baseName} (Split 1)`;
    p.hand = [c1, { ...newDeck.pop()!, isFaceUp: true }];
    p.score = calculateScore(p.hand);
    
    const newPlayer: Player = {
      id: `${p.id}-split-${Math.random()}`,
      name: `${baseName} (Split 2)`,
      hand: [c2, { ...newDeck.pop()!, isFaceUp: true }],
      status: 'playing',
      score: 0
    };
    newPlayer.score = calculateScore(newPlayer.hand);

    newPlayers.splice(activePlayerIdx + 1, 0, newPlayer);

    if (p.score === 21) p.status = 'stand';
    if (newPlayer.score === 21) newPlayer.status = 'stand';

    setDeck(newDeck);
    setPlayers(newPlayers);

    if (p.status === 'stand') {
        findNextActive(activePlayerIdx, newPlayers);
    }
  };

  const startDealerTurn = () => {
    setPhase('dealer');
    setActivePlayerIdx(-1);

    let currentDealerHand = [...dealer.hand];
    currentDealerHand[0].isFaceUp = true;
    let currentDealerScore = calculateScore(currentDealerHand);
    let currentDeck = [...deck];

    const dealerDraw = () => {
      if (currentDealerScore < 17) {
        const card = currentDeck.pop()!;
        currentDealerHand.push({ ...card, isFaceUp: true });
        currentDealerScore = calculateScore(currentDealerHand);
        setDealer({ hand: [...currentDealerHand], score: currentDealerScore });
        setDeck([...currentDeck]);
        setTimeout(dealerDraw, 600);
      } else {
        finishRound(currentDealerScore);
      }
    };

    setDealer({ hand: currentDealerHand, score: currentDealerScore });
    setTimeout(dealerDraw, 600);
  };

  const finishRound = (dealerFinalScore: number) => {
    setPhase('payout');
    const initialTotal = 6 * 52;
    if (deck.length < initialTotal * 0.25) {
      setMessage("reshuffling horse...");
    } else {
      setMessage("");
    }
  };

  const nextRound = () => {
    const basePlayers = players.filter(p => !p.id.includes('-split')).map(p => ({
        ...p,
        name: p.name.replace(/ \(Split \d+\)$/, ''),
        hand: [],
        status: 'playing' as const,
        score: 0
    }));
    
    setDealer({ hand: [], score: 0 });
    const d = deck.length < 52 ? createDeck() : deck;
    startDealing(basePlayers, d);
  };

  const canSplit = players[activePlayerIdx]?.hand.length === 2 && 
                   players[activePlayerIdx]?.hand[0].rank === players[activePlayerIdx]?.hand[1].rank;

  // --- UI Components ---
  const CardView = ({ card, index }: { card: Card, index: number }) => {
    return (
      <div
        className={`relative shrink-0 w-16 h-24 sm:w-24 sm:h-36 rounded shadow-md flex flex-col justify-between p-1.5 sm:p-2 font-mono ml-0 ${
          card.isFaceUp 
            ? 'bg-[var(--color-parchment)] text-[var(--color-ink)] border-2 border-[var(--color-parchment-border)]' 
            : 'bg-[var(--color-leather)] border-[6px] border-[var(--color-leather-dark)]'
        }`}
        style={{ 
            zIndex: index, 
            marginLeft: index > 0 ? '-2.5rem' : '0',
            transform: `rotate(${index % 2 === 0 ? '-2deg' : '2deg'})`
        }}
      >
        {card.isFaceUp ? (
          <div className="flex flex-col justify-between h-full w-full">
            <div className={`text-sm sm:text-lg font-bold flex flex-col items-center leading-none ${getSuitColor(card.suit)}`}>
              <span>{card.rank}</span>
              <span className="text-base sm:text-xl">{getSuitSymbol(card.suit)}</span>
            </div>
            <div className={`text-2xl sm:text-4xl self-center ${getSuitColor(card.suit)} opacity-80`}>
              {getSuitSymbol(card.suit)}
            </div>
            <div className={`text-sm sm:text-lg font-bold flex flex-col items-center leading-none rotate-180 ${getSuitColor(card.suit)}`}>
              <span>{card.rank}</span>
              <span className="text-base sm:text-xl">{getSuitSymbol(card.suit)}</span>
            </div>
          </div>
        ) : (
          <div className="w-full h-full border border-black/30 rounded-full flex flex-col items-center justify-center opacity-60">
             <Star className="text-[var(--color-wood-dark)]" size={24} fill="currentColor" />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-wood-base)] relative overflow-hidden text-[var(--color-parchment)]">
      
      {/* Header */}
      <header className="h-16 border-b-4 border-[var(--color-wood-dark)] flex items-center justify-between px-6 bg-[var(--color-leather)] z-10 shadow-[0_4px_10px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-3">
          <Badge className="text-[var(--color-gold)]" size={28} />
          <h1 className="text-2xl font-serif tracking-widest text-[var(--color-parchment)] uppercase" style={{ textShadow: '2px 2px 0 #000' }}>Saloon Blackjack</h1>
        </div>
        <div className="flex items-center gap-4 text-xs text-[var(--color-parchment)] font-mono opacity-80">
           <div className="flex items-center gap-1">
             <History size={16} /> HIGH STAKES
           </div>
           <div className="flex items-center gap-1">
             <Info size={16} /> S17 STANDS
           </div>
        </div>
      </header>

      {/* Main Game Area */}
      <main className="flex-1 p-4 sm:p-8 flex flex-col items-center z-10 relative">
        
        {/* SETUP PHASE */}
        {phase === 'setup' && (
          <div 
              className="max-w-md w-full wanted-poster p-8 sm:p-10 rounded text-center mt-12"
          >
            <Star className="mx-auto text-[var(--color-wood-dark)] mb-4" size={48} fill="currentColor" />
            <h2 className="text-4xl font-serif mb-6 text-[var(--color-ink)] uppercase tracking-wider">Sit Down</h2>
            
            <div className="space-y-6 text-left font-sans font-bold">
              <div>
                <label className="block mb-2 text-xl border-b-2 border-[var(--color-ink)] pb-1">Outlaws Count</label>
                <div className="grid grid-cols-3 gap-3">
                  {[2, 3, 4].map(n => (
                    <button
                      key={n}
                      onClick={() => setSetupConfig(prev => ({ ...prev, count: n }))}
                      className={`py-3 rounded border-2 text-xl ${setupConfig.count === n ? 'bg-[var(--color-wood-dark)] text-[var(--color-parchment)] border-[var(--color-wood-dark)] shadow-inner' : 'bg-transparent border-[var(--color-ink)] text-[var(--color-ink)] hover:bg-[var(--color-ink)] hover:text-[var(--color-parchment)]'}`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3 pt-6 border-t-2 border-dotted border-[var(--color-ink)]">
                <label className="block mb-1 text-xl border-b-2 border-[var(--color-ink)] pb-1">Names</label>
                {Array.from({ length: setupConfig.count }).map((_, i) => (
                  <input
                    key={i}
                    type="text"
                    placeholder={`Outlaw ${i+1}`}
                    className="w-full bg-transparent border-b-2 border-dashed border-[var(--color-ink)] py-2 px-2 focus:outline-none focus:border-solid text-xl"
                    value={setupConfig.names[i] || ''}
                    onChange={(e) => {
                      const newNames = [...setupConfig.names];
                      newNames[i] = e.target.value;
                      setSetupConfig(prev => ({ ...prev, names: newNames }));
                    }}
                  />
                ))}
              </div>

              <button 
                onClick={initGame}
                className="w-full mt-8 bg-[var(--color-wood-dark)] text-[var(--color-parchment)] font-serif text-2xl py-4 shadow-xl flex items-center justify-center gap-2 uppercase tracking-widest hover:bg-[var(--color-wood-base)] border-4 border-transparent hover:border-[var(--color-leather)]"
              >
                Deal the Cards
              </button>
            </div>
          </div>
        )}

        {/* GAME TABLE */}
        {(phase === 'dealing' || phase === 'action' || phase === 'dealer' || phase === 'payout') && (
          <div className="w-full max-w-7xl h-full flex flex-col py-4 saloon-table border-[12px] border-[var(--color-wood-dark)] rounded-[32px] table-shadow items-center justify-between pb-32 sm:pb-32 relative">
            
            {/* Dealer Area */}
            <div className="flex flex-col items-center mt-4">
              <div className="font-serif text-[var(--color-parchment)] uppercase tracking-widest text-lg sm:text-xl border-b-2 border-[var(--color-parchment)] px-6 py-1 mb-8 opacity-90">Dealer</div>
              <div className="flex justify-center min-h-[144px]">
                 {dealer.hand.map((card, idx) => (
                   <CardView key={card.id} card={card} index={idx} />
                 ))}
              </div>
              {dealer.hand.length > 0 && phase !== 'dealing' && (
                <div className="mt-6 px-4 py-1 bg-[var(--color-wood-dark)] text-[var(--color-parchment)] border-2 border-[var(--color-leather)] shadow-md text-sm uppercase tracking-widest font-bold">
                  Score: <span className="font-mono text-[var(--color-gold)]">{dealer.score}</span>
                </div>
              )}
            </div>

            {/* Players Area */}
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-12 mt-12 px-4 w-full">
              {players.map((player, idx) => (
                <div 
                  key={player.id} 
                  className={`flex flex-col items-center min-w-[160px] sm:min-w-[200px] relative ${activePlayerIdx === idx ? 'z-10 scale-105' : 'z-0 scale-[0.98]'}`}
                >
                  {/* Status Overlays */}
                  {player.status === 'bust' && (
                     <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 font-serif text-[var(--color-parchment)] font-black text-4xl sm:text-5xl -rotate-12 bg-[#8b0000] border-4 border-[var(--color-wood-dark)] px-4 py-1 shadow-[4px_4px_0_var(--color-wood-dark)] tracking-wider">
                       DEAD
                     </div>
                  )}
                  {player.status === 'blackjack' && (
                     <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 font-serif text-[var(--color-ink)] font-black text-2xl sm:text-3xl -rotate-6 bg-[var(--color-gold)] border-4 border-[var(--color-wood-dark)] px-4 py-1 shadow-[4px_4px_0_var(--color-wood-dark)] tracking-widest">
                       BLACKJACK
                     </div>
                  )}

                  <div className="flex justify-center min-h-[144px] mb-8 relative">
                     {player.hand.map((card, cIdx) => (
                       <CardView key={card.id} card={card} index={cIdx} />
                     ))}
                  </div>

                  <div className={`px-4 py-3 border-2 w-full text-center relative z-10 ${activePlayerIdx === idx ? 'bg-[var(--color-wood-dark)] border-[var(--color-gold)] shadow-[0_0_15px_rgba(197,160,89,0.3)]' : 'bg-[var(--color-wood-base)] border-[var(--color-leather)]'}`}>
                     <div className="text-[10px] uppercase font-bold tracking-widest mb-1 opacity-70">
                        {activePlayerIdx === idx ? 'Draws Next' : player.status === 'blackjack' ? 'Sheriff' : player.status === 'bust' ? 'Shot Down' : player.status === 'stand' ? 'Stands' : 'Waiting'}
                     </div>
                     <div className="font-serif text-lg tracking-widest truncate">{player.name}</div>
                     <div className="mt-2 text-sm font-bold opacity-90">Score: {player.score}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Action Board */}
            {(phase === 'dealing' || phase === 'action' || phase === 'dealer' || phase === 'payout') && (
              <div className="absolute bottom-0 left-0 right-0 h-28 bg-[var(--color-wood-dark)] border-t-[8px] border-[var(--color-wood-base)] p-4 flex items-center justify-between shadow-[0_-10px_20px_rgba(0,0,0,0.8)] z-30">
                
                <div className="text-xs text-[var(--color-parchment)] uppercase font-bold text-center w-1/4 opacity-60">
                  <div className="text-lg font-mono mb-1">{Math.floor((deck.length / (6*52)) * 100)}%</div>
                  Shoe
                </div>

                <div className="flex items-center justify-center gap-4 w-1/2">
                    <button 
                      disabled={phase !== 'action'}
                      onClick={handleStand}
                      className="h-16 px-6 button-wood rounded-md text-[var(--color-parchment)] uppercase font-bold tracking-widest disabled:opacity-50 disabled:grayscale transition-none"
                    >
                      Stand
                    </button>
                    <button 
                      disabled={phase !== 'action'}
                      onClick={handleHit}
                      className="h-20 px-8 button-wood rounded-md bg-gradient-to-b from-[#6e1616] to-[#4a0a0a] border-[#2c0000] text-[var(--color-parchment)] uppercase font-black text-xl tracking-widest disabled:opacity-50 hover:from-[#8b1c1c] hover:to-[#6e1616] shadow-[0_5px_15px_rgba(0,0,0,0.8)] transition-none"
                    >
                      Hit
                    </button>
                    <div className="flex flex-col gap-2">
                        <button 
                          disabled={phase !== 'action' || players[activePlayerIdx]?.hand.length > 2}
                          onClick={handleDoubleDown}
                          className="h-12 w-24 button-wood rounded-sm text-xs font-bold uppercase tracking-widest disabled:opacity-50 transition-none"
                        >
                          Double
                        </button>
                        {canSplit && phase === 'action' && (
                            <button 
                              onClick={handleSplit}
                              className="h-12 w-24 button-wood rounded-sm text-xs font-bold uppercase tracking-widest text-[#a8ddeb] transition-none"
                            >
                              Split
                            </button>
                        )}
                    </div>
                </div>

                <div className="w-1/4 text-center">
                     {message && (
                       <div className="text-[var(--color-gold)] text-xs font-bold uppercase tracking-widest">
                         {message}
                       </div>
                     )}
                </div>
              </div>
            )}
          </div>
        )}

      </main>

      {/* Payout Summary Modal */}
      {phase === 'payout' && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full wanted-poster p-6 sm:p-10 text-center relative pointer-events-auto">
            
            <div className="absolute top-4 left-4 right-4 flex justify-between px-4 opacity-50">
              <Skull size={32} />
              <Skull size={32} />
            </div>

            <h2 className="text-5xl font-serif mb-2 mt-4 tracking-widest uppercase" style={{ textShadow: '2px 2px 0 var(--color-parchment-border)' }}>The Reckoning</h2>
            <div className="font-sans text-xl font-bold border-b-2 border-[var(--color-ink)] pb-4 mb-8">
              Dealer Score: {dealer.score > 21 ? 'DEAD' : dealer.score}
            </div>
            
            <div className="grid grid-cols-1 gap-4 text-left font-bold text-lg max-h-[40vh] overflow-y-auto pr-2">
              {players.map(p => {
                const isBust = p.status === 'bust';
                const isDealerBust = dealer.score > 21;
                const win = !isBust && (isDealerBust || p.score > dealer.score);
                const push = !isBust && !isDealerBust && p.score === dealer.score;
                
                return (
                  <div key={p.id} className="flex items-center justify-between border-b-2 border-dotted border-[var(--color-ink)] pb-2 mb-2">
                    <span className="font-serif text-2xl truncate pr-4">{p.name}</span>
                    <div className="flex items-center gap-6">
                      <span className="font-mono text-xl">{isBust ? 'BUST' : p.score}</span>
                      <span className={`px-3 border-2 border-[var(--color-ink)] rotate-[${(Math.random()*6-3).toFixed(1)}deg] shadow-[2px_2px_0_var(--color-ink)] ${
                        win ? 'bg-[#2b5329] text-white' : push ? 'bg-[var(--color-wood-base)] text-white' : 'bg-[#8b0000] text-white'
                      }`}>
                         {isBust ? 'HANGED' : win ? 'WANTED' : push ? 'SPARED' : 'ROBBED'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-6 mt-12">
              <button 
                onClick={nextRound}
                className="bg-[var(--color-wood-dark)] text-[var(--color-parchment)] py-4 font-serif text-2xl uppercase tracking-widest hover:bg-[var(--color-wood-base)] border-4 border-transparent hover:border-[var(--color-leather)] shadow-[0_5px_15px_rgba(0,0,0,0.5)]"
              >
                Deal Again
              </button>
              <button 
                onClick={() => { setPhase('setup'); setDealer({hand:[], score:0}); setPlayers([]); setDeck([]); }}
                className="bg-transparent border-[var(--color-ink)] text-[var(--color-ink)] py-4 font-serif text-2xl uppercase tracking-widest hover:bg-[var(--color-ink)] hover:text-[var(--color-parchment)] border-4"
              >
                Leave Saloon
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
