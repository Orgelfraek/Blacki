/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Play, RotateCcw, ChevronRight, Trophy, History, Info, SplitSquareHorizontal } from 'lucide-react';

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
  return (suit === 'hearts' || suit === 'diamonds') ? 'text-red-600' : 'text-black';
};

const calculateScore = (hand: Card[]): number => {
  let score = 0;
  let aces = 0;

  hand.forEach(card => {
    if (!card.isFaceUp) return; // Only count face-up cards
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

// --- Main Component ---

export default function App() {
  const [phase, setPhase] = useState<GamePhase>('setup');
  const [players, setPlayers] = useState<Player[]>([]);
  const [activePlayerIdx, setActivePlayerIdx] = useState(0);
  const [dealer, setDealer] = useState<{ hand: Card[]; score: number }>({ hand: [], score: 0 });
  const [deck, setDeck] = useState<Card[]>([]);
  const [message, setMessage] = useState<string>('');
  const [setupConfig, setSetupConfig] = useState<{ count: number; names: string[] }>({
    count: 2,
    names: ['Player 1', 'Player 2', 'Player 3', 'Player 4'],
  });

  // --- Deck Logic ---

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

  // --- Game Flow Actions ---

  const initGame = () => {
    const initialPlayers: Player[] = Array.from({ length: setupConfig.count }).map((_, i) => ({
      id: String(i),
      name: setupConfig.names[i] || `Player ${i + 1}`,
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

    // Deal Sequence: Player 1..N, Dealer hidden, Player 1..N, Dealer Up
    for (let i = 0; i < newPlayers.length; i++) {
        newPlayers[i].hand.push({ ...newDeck.pop()!, isFaceUp: true });
    }
    // Dealer 1st card (face down initially, flipped at end)
    newDealerHand.push({ ...newDeck.pop()!, isFaceUp: false });

    for (let i = 0; i < newPlayers.length; i++) {
        newPlayers[i].hand.push({ ...newDeck.pop()!, isFaceUp: true });
        newPlayers[i].score = calculateScore(newPlayers[i].hand);
        if (newPlayers[i].score === 21) {
            newPlayers[i].status = 'blackjack';
        }
    }
    // Dealer 2nd card (face up)
    newDealerHand.push({ ...newDeck.pop()!, isFaceUp: true });

    setDeck(newDeck);
    setPlayers(newPlayers);
    setDealer({ hand: newDealerHand, score: calculateScore(newDealerHand) });
    
    setTimeout(() => {
      setPhase('action');
      findNextActive(0, newPlayers);
    }, 2000);
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
      setTimeout(() => findNextActive(activePlayerIdx, newPlayers), 800);
    } else if (score === 21) {
      newPlayers[activePlayerIdx].status = 'stand';
      setDeck(newDeck);
      setPlayers(newPlayers);
      setTimeout(() => findNextActive(activePlayerIdx, newPlayers), 800);
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
    // Without money, Double Down just means hit exactly once and force stand.
    const newDeck = [...deck];
    const newPlayers = [...players];
    const player = newPlayers[activePlayerIdx];
    
    // Add one card
    const card = newDeck.pop()!;
    player.hand.push({ ...card, isFaceUp: true });
    const score = calculateScore(player.hand);
    player.score = score;
    
    if (score > 21) player.status = 'bust';
    else player.status = 'stand';
    
    setDeck(newDeck);
    setPlayers(newPlayers);
    setTimeout(() => findNextActive(activePlayerIdx, newPlayers), 800);
  };

  const handleSplit = () => {
    const newDeck = [...deck];
    const newPlayers = [...players];
    const p = newPlayers[activePlayerIdx];
    
    // Safety check
    if (p.hand.length !== 2 || p.hand[0].rank !== p.hand[1].rank) return;

    const c1 = p.hand[0];
    const c2 = p.hand[1];

    const baseName = p.name.replace(/ \(Hand \d+\)$/, '');

    // Hand 1 (modify current)
    p.name = `${baseName} (Hand 1)`;
    p.hand = [c1, { ...newDeck.pop()!, isFaceUp: true }];
    p.score = calculateScore(p.hand);
    
    // Hand 2 (insert new)
    const newPlayer: Player = {
      id: `${p.id}-split-${Math.random()}`,
      name: `${baseName} (Hand 2)`,
      hand: [c2, { ...newDeck.pop()!, isFaceUp: true }],
      status: 'playing',
      score: 0
    };
    newPlayer.score = calculateScore(newPlayer.hand);

    newPlayers.splice(activePlayerIdx + 1, 0, newPlayer);

    // Auto-stand if 21 on deal
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

    // Reveal hidden card
    let currentDealerHand = [...dealer.hand];
    currentDealerHand[0].isFaceUp = true; // Flip the hole card
    let currentDealerScore = calculateScore(currentDealerHand);
    let currentDeck = [...deck];

    const dealerDraw = () => {
      if (currentDealerScore < 17) {
        const card = currentDeck.pop()!;
        currentDealerHand.push({ ...card, isFaceUp: true });
        currentDealerScore = calculateScore(currentDealerHand);
        setDealer({ hand: [...currentDealerHand], score: currentDealerScore });
        setDeck([...currentDeck]);
        setTimeout(dealerDraw, 800);
      } else {
        finishRound(currentDealerScore);
      }
    };

    setDealer({ hand: currentDealerHand, score: currentDealerScore });
    setTimeout(dealerDraw, 800);
  };

  const finishRound = (dealerFinalScore: number) => {
    setPhase('payout');
    
    // Check if shoe needs re-shuffling (75% used)
    const initialTotal = 6 * 52;
    if (deck.length < initialTotal * 0.25) {
      setMessage("Dealer shuffling new shoe next round...");
    } else {
      setMessage("");
    }
  };

  const nextRound = () => {
    // Remove split hands for the next round
    const basePlayers = players.filter(p => !p.id.includes('-split')).map(p => ({
        ...p,
        name: p.name.replace(/ \(Hand \d+\)$/, ''), // Clean up names if they didn't split all hands
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

  interface CardViewProps {
    card: Card;
    index: number;
    isDealer?: boolean;
  }

  const CardView = ({ card, index, isDealer = false }: CardViewProps) => {
    return (
      <motion.div
        layout
        initial={{ y: -300, x: 200, opacity: 0, rotateY: 180, scale: 0.5 }}
        animate={{ 
            y: 0, 
            x: 0, 
            opacity: 1, 
            rotateY: card.isFaceUp ? 0 : 180, 
            scale: 1,
            rotateZ: isDealer ? index * 5 : (index - 1) * 8 
        }}
        transition={{ type: 'spring', damping: 20, stiffness: 120, delay: index * 0.15 }}
        className={`relative shrink-0 w-16 h-24 sm:w-24 sm:h-36 rounded-lg card-shadow flex flex-col justify-between p-1.5 sm:p-2 font-mono ml-0 ${
          card.isFaceUp ? 'bg-white border border-gray-200' : 'bg-casino-edge border-4 border-gold'
        }`}
        style={{ 
            zIndex: index, 
            transformStyle: 'preserve-3d',
            marginLeft: index > 0 ? '-2.5rem' : '0'
        }}
      >
        {card.isFaceUp ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col justify-between h-full w-full">
            <div className={`text-sm sm:text-lg font-bold flex flex-col items-center leading-none ${getSuitColor(card.suit)}`}>
              <span>{card.rank}</span>
              <span className="text-base sm:text-xl">{getSuitSymbol(card.suit)}</span>
            </div>
            <div className={`text-2xl sm:text-4xl self-center ${getSuitColor(card.suit)}`}>
              {getSuitSymbol(card.suit)}
            </div>
            <div className={`text-sm sm:text-lg font-bold flex flex-col items-center leading-none rotate-180 ${getSuitColor(card.suit)}`}>
              <span>{card.rank}</span>
              <span className="text-base sm:text-xl">{getSuitSymbol(card.suit)}</span>
            </div>
          </motion.div>
        ) : (
          <div className="w-full h-full rounded flex items-center justify-center p-1" style={{ transform: 'rotateY(180deg)' }}>
             <div className="w-full h-full border border-gold/30 rounded flex items-center justify-center">
                <span className="text-gold text-xl sm:text-3xl">♣</span>
             </div>
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-casino-dark relative overflow-hidden font-sans">
      
      {/* Table Structure */}
      <div className="absolute inset-4 rounded-[240px] border-[16px] border-casino-edge bg-casino-felt mt-16 mb-4 table-shadow overflow-hidden">
        
        {/* Background Radial Polish */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-40" 
          style={{ backgroundImage: 'radial-gradient(circle at center, transparent 30%, #000 100%)' }}
        ></div>

        {/* Decorative Table Edge Labels */}
        <div className="absolute top-1/2 left-4 -translate-y-1/2 text-gold/10 font-black text-6xl select-none rotate-90 tracking-[1em]">CASINO</div>
        <div className="absolute top-1/2 right-4 -translate-y-1/2 text-gold/10 font-black text-6xl select-none -rotate-90 tracking-[1em]">PRESTIGE</div>

        {/* Shoe Graphic */}
        <div className="absolute top-8 right-16 w-16 h-24 sm:w-24 sm:h-36 border-2 border-gold/20 rounded-xl bg-casino-edge shadow-[0_0_30px_rgba(197,160,89,0.1)] flex items-center justify-center opacity-70 z-0">
             <div className="text-gold/30 font-black tracking-widest text-[10px] sm:text-xs uppercase rotate-90">SHOE</div>
        </div>

        {/* Table Decor Markings */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none">
           <div className="border-[2px] border-gold/10 rounded-[50%] w-[600px] h-[300px]"></div>
           <div className="mt-[-150px] text-center opacity-30">
              <div className="text-gold font-serif italic text-5xl mb-2">Blackjack</div>
              <div className="text-white/60 text-xs uppercase tracking-[0.4em] font-bold">Standard Play</div>
           </div>
        </div>

        {/* Action Board (ActionBar) */}
        {(phase === 'dealing' || phase === 'action' || phase === 'dealer' || phase === 'payout') && (
          <div className="z-20 w-full max-w-3xl bg-casino-edge border-t-2 border-gold rounded-t-3xl p-6 flex items-center justify-between absolute bottom-0 left-1/2 -translate-x-1/2 action-bar-shadow">
            
            <div className="text-[10px] sm:text-xs text-gold uppercase font-bold text-center w-1/4">
              <div className="text-sm sm:text-lg font-mono text-white mb-1">{Math.floor((deck.length / (6*52)) * 100)}%</div>
              Shoe Status
            </div>

            <div className="flex items-center justify-center gap-2 sm:gap-6 w-1/2">
                <button 
                  disabled={phase !== 'action'}
                  onClick={handleStand}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 border-red-800 bg-red-600 hover:bg-red-500 shadow-lg flex flex-col items-center justify-center transition-all active:scale-95 disabled:opacity-30"
                >
                  <span className="text-[10px] sm:text-xs font-black uppercase tracking-tighter">Stand</span>
                </button>
                <button 
                  disabled={phase !== 'action'}
                  onClick={handleHit}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-blue-800 bg-blue-600 hover:bg-blue-500 shadow-xl flex flex-col items-center justify-center scale-110 transition-all active:scale-95 disabled:opacity-30"
                >
                  <span className="text-xs sm:text-sm font-black uppercase tracking-tighter">Hit</span>
                </button>
                <div className="flex flex-col gap-2">
                    <button 
                      disabled={phase !== 'action' || players[activePlayerIdx]?.hand.length > 2}
                      onClick={handleDoubleDown}
                      className="w-12 h-12 sm:w-16 sm:h-16 rounded-full border-4 border-yellow-800 bg-yellow-600 hover:bg-yellow-500 shadow-lg flex flex-col items-center justify-center transition-all active:scale-95 disabled:opacity-30"
                    >
                      <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-tighter leading-none text-center">Double</span>
                    </button>
                    {canSplit && phase === 'action' && (
                        <motion.button 
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          onClick={handleSplit}
                          className="w-12 h-12 sm:w-16 sm:h-16 rounded-full border-4 border-emerald-800 bg-emerald-600 hover:bg-emerald-500 shadow-lg flex flex-col items-center justify-center transition-all active:scale-95 text-white"
                        >
                          <SplitSquareHorizontal size={18} />
                          <span className="text-[8px] sm:text-[9px] font-black uppercase mt-1">Split</span>
                        </motion.button>
                    )}
                </div>
            </div>

            <div className="w-1/4 text-center">
                 {message && (
                   <motion.div 
                    initial={{ opacity: 0, y: 10 }} 
                    animate={{ opacity: 1, y: 0 }}
                    className="text-gold text-[10px] font-bold uppercase tracking-widest"
                   >
                     {message}
                   </motion.div>
                 )}
            </div>
          </div>
        )}
      </div>

      {/* Header */}
      <header className="h-16 border-b border-gold/30 flex items-center justify-between px-6 bg-black/40 backdrop-blur-md z-10">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-gold rounded-full">
            <Trophy className="text-casino-dark" size={20} />
          </div>
          <h1 className="text-xl font-serif font-bold tracking-tight text-white italic">PRESTIGE CASINO</h1>
        </div>
        <div className="flex items-center gap-4 text-xs text-gold font-mono">
           <div className="flex items-center gap-1">
             <History size={14} /> MULTIPLAYER
           </div>
           <div className="flex items-center gap-1">
             <Info size={14} /> S17 STANDS
           </div>
        </div>
      </header>

      {/* Main Game Area */}
      <main className="flex-1 p-6 flex flex-col items-center justify-center z-10 relative">
        
        <AnimatePresence mode="wait">
          
          {/* SETUP PHASE */}
          {phase === 'setup' && (
            <motion.div 
                key="setup"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="max-w-md w-full bg-casino-edge/90 backdrop-blur-xl p-8 rounded-3xl border-2 border-gold/30 text-center shadow-2xl"
            >
              <Users className="mx-auto text-gold mb-4" size={48} />
              <h2 className="text-2xl font-serif font-bold mb-6 text-gold">Exclusive Table</h2>
              
              <div className="space-y-6 text-left">
                <div>
                  <label className="text-xs uppercase text-gold/50 block mb-2 font-bold tracking-widest">Number of Players</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[2, 3, 4].map(n => (
                      <button
                        key={n}
                        onClick={() => setSetupConfig(prev => ({ ...prev, count: n }))}
                        className={`py-3 rounded-xl border transition-all ${setupConfig.count === n ? 'bg-gold text-casino-dark border-gold font-bold shadow-[0_0_15px_rgba(197,160,89,0.5)]' : 'bg-white/5 border-white/10 hover:bg-white/10 text-white/50'}`}
                      >
                        {n} Seats
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs uppercase text-gold/50 block mb-1 font-bold tracking-widest">Player Names</label>
                  {Array.from({ length: setupConfig.count }).map((_, i) => (
                    <input
                      key={i}
                      type="text"
                      placeholder={`Player ${i+1}`}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-gold transition-colors text-white"
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
                  className="w-full bg-gold hover:bg-gold/90 text-casino-dark font-black py-4 rounded-2xl transition-all shadow-xl flex items-center justify-center gap-2 group uppercase tracking-widest"
                >
                  <Play size={20} fill="currentColor" />
                  Join Table
                  <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </motion.div>
          )}

          {/* GAME TABLE */}
          {(phase === 'dealing' || phase === 'action' || phase === 'dealer' || phase === 'payout') && (
            <div key="table" className="w-full max-w-7xl h-full flex flex-col justify-between py-8">
              
              {/* Dealer Area */}
              <div className="flex flex-col items-center mb-12">
                <div className="text-gold uppercase tracking-[0.3em] text-[10px] sm:text-xs font-bold mb-4">Dealer Stands on 17</div>
                <div className="flex justify-center min-h-[144px]">
                   {dealer.hand.map((card, idx) => (
                     <CardView key={card.id} card={card} index={idx} isDealer />
                   ))}
                </div>
                {dealer.hand.length > 0 && phase !== 'dealing' && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    className="mt-8 px-4 py-1 bg-black/40 backdrop-blur rounded-full border border-white/10 text-xs uppercase tracking-widest font-bold"
                  >
                    Dealer Score: <span className="text-gold font-mono ml-2">{dealer.score}</span>
                  </motion.div>
                )}
              </div>


              {/* Players Area */}
              <motion.div layout className="flex flex-wrap justify-center gap-x-8 gap-y-16 mt-12 px-4 sm:px-12 pb-24">
                <AnimatePresence>
                {players.map((player, idx) => (
                  <motion.div 
                    layout
                    key={player.id} 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: activePlayerIdx === idx ? 1.05 : 0.95 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    className={`flex flex-col items-center transition-all duration-500 min-w-[160px] sm:min-w-[200px] relative ${activePlayerIdx === idx ? 'z-10' : 'z-0'}`}
                  >
                    
                    {/* Fancy Overlays */}
                    {player.status === 'bust' && (
                       <motion.div 
                         initial={{ scale: 0, opacity: 0 }} 
                         animate={{ scale: 1, opacity: 1 }} 
                         className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
                       >
                         <div className="text-red-500 font-black text-3xl sm:text-4xl rotate-[-15deg] uppercase border-4 border-red-500 px-4 py-1 rounded-xl bg-black/60 backdrop-blur shadow-[0_0_20px_rgba(239,68,68,0.5)]">
                           Bust
                         </div>
                       </motion.div>
                    )}
                    {player.status === 'blackjack' && (
                       <motion.div 
                         initial={{ scale: 0, opacity: 0 }} 
                         animate={{ scale: 1, opacity: 1 }} 
                         className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
                       >
                         <div className="text-gold font-black text-2xl sm:text-3xl rotate-[-10deg] uppercase border-4 border-gold px-4 py-1 rounded-xl bg-black/60 backdrop-blur shadow-[0_0_20px_rgba(197,160,89,0.5)]">
                           Blackjack
                         </div>
                       </motion.div>
                    )}

                    <div className="flex justify-center min-h-[96px] mb-16 relative">
                       {player.hand.map((card, cIdx) => (
                         <CardView key={card.id} card={card} index={cIdx} />
                       ))}
                    </div>

                    <motion.div layout className={`px-4 py-3 rounded-2xl border w-full text-center transition-all duration-300 relative z-10 ${activePlayerIdx === idx ? 'bg-black/60 border-gold shadow-[0_0_15px_rgba(197,160,89,0.3)]' : 'bg-black/40 border-white/10'}`}>
                       <div className="text-[10px] uppercase font-black tracking-widest mb-1" style={{ color: activePlayerIdx === idx ? 'var(--color-gold)' : 'rgba(255,255,255,0.4)' }}>
                          {activePlayerIdx === idx ? 'Active Turn' : player.status === 'blackjack' ? 'Natural BJ' : player.status === 'bust' ? 'Busted' : player.status === 'stand' ? 'Stands' : 'Waiting'}
                       </div>
                       <div className="font-bold text-sm tracking-widest truncate">{player.name}</div>
                       
                       <div className="mt-2 text-xs font-black text-gold">Score: {player.score}</div>
                    </motion.div>
                  </motion.div>
                ))}
                </AnimatePresence>
              </motion.div>

              {/* Payout Summary Modal */}
              {phase === 'payout' && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="fixed inset-0 z-[100] bg-casino-dark/90 backdrop-blur-xl flex items-center justify-center p-4"
                >
                  <div className="max-w-xl w-full bg-casino-edge border-2 border-gold/30 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)]">
                    <div className="bg-gold py-5 px-8 flex items-center justify-between">
                      <h2 className="text-casino-dark text-2xl font-serif font-black italic tracking-tight">ROUND SETTLEMENT</h2>
                      <div className="text-casino-dark/60 font-mono text-xs font-bold leading-none uppercase tracking-widest">Dealer: {dealer.score > 21 ? 'BUSTED' : dealer.score}</div>
                    </div>
                    
                    <div className="p-8">
                       <table className="w-full text-left">
                          <thead>
                            <tr className="text-[10px] text-gold font-black uppercase tracking-[0.3em] border-b border-gold/10">
                              <th className="pb-4">Patron</th>
                              <th className="pb-4">Score</th>
                              <th className="pb-4 text-right">Outcome</th>
                            </tr>
                          </thead>
                          <tbody className="font-mono">
                            {players.map(p => (
                              <tr key={p.id} className="border-b border-white/5">
                                <td className="py-4 font-serif text-sm tracking-widest text-white italic">{p.name}</td>
                                <td className="py-4 text-white/50">{p.status === 'bust' ? 'Bust' : p.score}</td>
                                <td className="py-4 text-right">
                                  <span className={`text-[10px] font-black tracking-widest px-2 py-1 rounded-full ${
                                    p.status === 'bust' ? 'bg-red-900/50 text-red-400' :
                                    p.status === 'blackjack' ? 'bg-gold/20 text-gold shadow-[0_0_10px_rgba(197,160,89,0.2)]' :
                                    (dealer.score > 21 || p.score > dealer.score) ? 'bg-emerald-900/50 text-emerald-400' :
                                    p.score === dealer.score ? 'bg-white/5 text-white/40' : 'bg-red-900/50 text-red-400'
                                  }`}>
                                    {p.status === 'bust' ? 'BUST' : 
                                     p.status === 'blackjack' ? 'BLACKJACK' :
                                     (dealer.score > 21 || p.score > dealer.score) ? 'WINNER' :
                                     p.score === dealer.score ? 'PUSH' : 'LOSS'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                       </table>

                       <div className="grid grid-cols-2 gap-4 mt-8">
                          <button 
                            onClick={nextRound}
                            className="bg-gold hover:bg-gold/90 text-casino-dark py-4 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95"
                          >
                            <RotateCcw size={16} />
                            Deal Next
                          </button>
                          <button 
                            onClick={() => { setPhase('setup'); setDealer({hand:[], score:0}); setPlayers([]); setDeck([]); }}
                            className="bg-white/5 hover:bg-white/10 text-white/40 py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 border border-white/5"
                          >
                            Leave Table
                          </button>
                       </div>
                    </div>
                  </div>
                </motion.div>
              )}

            </div>
          )}

        </AnimatePresence>

      </main>
    </div>
  );
}
