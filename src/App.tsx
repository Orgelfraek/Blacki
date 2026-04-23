/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Play, 
  RotateCcw, 
  Hand, 
  ChevronRight, 
  Trophy, 
  Coins, 
  User,
  History,
  Info
} from 'lucide-react';

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
  id: number;
  name: string;
  balance: number;
  currentBet: number;
  hand: Card[];
  status: 'playing' | 'stand' | 'bust' | 'blackjack' | 'waiting';
  score: number;
}

type GamePhase = 'setup' | 'betting' | 'dealing' | 'action' | 'dealer' | 'payout';

// --- Constants ---

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const INITIAL_BANKROLL = 1000;
const MIN_BET = 10;

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
    // Fisher-Yates Shuffle
    for (let i = newDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
    }
    return newDeck;
  }, []);

  const drawCard = useCallback((faceUp = true) => {
    setDeck(prevDeck => {
      const newDeck = [...prevDeck];
      const card = newDeck.pop();
      if (!card) return prevDeck;
      return newDeck;
    });
    
    // We actually need the card back, so we'll handle this in the calling function
    // but React state is async. Let's rethink.
    // Better: keep a ref or a non-state deck if we do it in one go, 
    // or use a functional update and return the card somehow.
    // However, since it's turn-based, we can just pop from local copy and update state.
  }, []);

  // --- Game Flow Actions ---

  const initGame = () => {
    const initialPlayers: Player[] = Array.from({ length: setupConfig.count }).map((_, i) => ({
      id: i,
      name: setupConfig.names[i] || `Player ${i + 1}`,
      balance: INITIAL_BANKROLL,
      currentBet: 0,
      hand: [],
      status: 'waiting',
      score: 0,
    }));
    setPlayers(initialPlayers);
    setDeck(createDeck());
    setPhase('betting');
    setActivePlayerIdx(0);
  };

  const handleBet = (amount: number) => {
    const updatedPlayers = [...players];
    updatedPlayers[activePlayerIdx].currentBet = amount;
    updatedPlayers[activePlayerIdx].balance -= amount;
    setPlayers(updatedPlayers);

    if (activePlayerIdx < players.length - 1) {
      setActivePlayerIdx(prev => prev + 1);
    } else {
      startDealing();
    }
  };

  const startDealing = async () => {
    setPhase('dealing');
    const newDeck = [...deck];
    const newPlayers = [...players].map(p => ({ ...p, hand: [], status: 'playing' as const, score: 0 }));
    let newDealerHand: Card[] = [];

    // Deal 2 cards to each player and dealer
    // 1st card players
    for (let i = 0; i < newPlayers.length; i++) {
      const card = newDeck.pop()!;
      newPlayers[i].hand.push({ ...card, isFaceUp: true });
      newPlayers[i].score = calculateScore(newPlayers[i].hand);
    }
    // 1st card dealer
    const dCard1 = newDeck.pop()!;
    newDealerHand.push({ ...dCard1, isFaceUp: true });

    // 2nd card players
    for (let i = 0; i < newPlayers.length; i++) {
      const card = newDeck.pop()!;
      newPlayers[i].hand.push({ ...card, isFaceUp: true });
      newPlayers[i].score = calculateScore(newPlayers[i].hand);
      if (newPlayers[i].score === 21) {
        newPlayers[i].status = 'blackjack';
      }
    }
    // 2nd card dealer (face down)
    const dCard2 = newDeck.pop()!;
    newDealerHand.push({ ...dCard2, isFaceUp: false });

    setDeck(newDeck);
    setPlayers(newPlayers);
    setDealer({ hand: newDealerHand, score: calculateScore([newDealerHand[0]]) }); // Hidden card doesn't count for UI score yet
    
    setTimeout(() => {
      setPhase('action');
      setActivePlayerIdx(0);
      // Skip players who got Blackjack
      findNextActive(0, newPlayers);
    }, 1000);
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
      findNextActive(activePlayerIdx, newPlayers);
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
    
    // Double bet
    player.balance -= player.currentBet;
    player.currentBet *= 2;
    
    // Add one card
    const card = newDeck.pop()!;
    player.hand.push({ ...card, isFaceUp: true });
    const score = calculateScore(player.hand);
    player.score = score;
    
    if (score > 21) {
      player.status = 'bust';
    } else {
      player.status = 'stand';
    }
    
    setDeck(newDeck);
    setPlayers(newPlayers);
    findNextActive(activePlayerIdx, newPlayers);
  };

  const startDealerTurn = () => {
    setPhase('dealer');
    setActivePlayerIdx(-1); // No active player

    // Reveal hidden card
    let currentDealerHand = dealer.hand.map(c => ({ ...c, isFaceUp: true }));
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
    const updatedPlayers = players.map(player => {
      let resultBalance = player.balance;
      
      if (player.status === 'blackjack') {
        const dScore = calculateScore(dealer.hand);
        if (dScore === 21 && dealer.hand.length === 2) {
            // Push
            resultBalance += player.currentBet;
        } else {
            // Blackjack pays 3:2
            resultBalance += player.currentBet + player.currentBet * 1.5;
        }
      } else if (player.status === 'bust') {
        // Lose (bet already deducted)
      } else if (dealerFinalScore > 21) {
        // Dealer busts
        resultBalance += player.currentBet * 2;
      } else if (player.score > dealerFinalScore) {
        // Win
        resultBalance += player.currentBet * 2;
      } else if (player.score === dealerFinalScore) {
        // Push
        resultBalance += player.currentBet;
      }
      // Else lose (already deducted)

      return { ...player, balance: resultBalance };
    });

    setPlayers(updatedPlayers);
    
    // Check if shoe needs re-shuffling (75% used)
    const initialTotal = 6 * 52;
    if (deck.length < initialTotal * 0.25) {
      setMessage("Dealer is shuffling the shoe...");
      setDeck(createDeck());
    }
  };

  const nextRound = () => {
    setPlayers(prev => prev.map(p => ({
        ...p,
        hand: [],
        currentBet: 0,
        status: 'waiting',
        score: 0
    })));
    setDealer({ hand: [], score: 0 });
    setPhase('betting');
    setActivePlayerIdx(0);
    setMessage('');
  };

  // --- UI Components ---

  interface CardViewProps {
    card: Card;
    index: number;
    isDealer?: boolean;
    key?: string; // Explicitly allow key even though React handles it
  }

  const CardView = ({ card, index, isDealer = false }: CardViewProps) => {
    return (
      <motion.div
        initial={{ y: -200, opacity: 0, rotate: 0 }}
        animate={{ y: 0, opacity: 1, rotate: index * 2 }}
        className={`relative w-16 h-24 sm:w-24 sm:h-36 bg-white rounded-lg border border-gray-200 card-shadow flex flex-col justify-between p-1.5 sm:p-2 font-mono ${!card.isFaceUp ? 'border-4 border-gold' : ''} -ml-10 first:ml-0`}
        style={{ zIndex: index }}
      >
        {card.isFaceUp ? (
          <>
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
          </>
        ) : (
          <div className="w-full h-full bg-casino-edge rounded flex items-center justify-center p-1">
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

        {/* Table Decor Markings */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none">
           <div className="border-[2px] border-gold/10 rounded-[50%] w-[600px] h-[300px]"></div>
           <div className="mt-[-150px] text-center opacity-30">
              <div className="text-gold font-serif italic text-5xl mb-2">Blackjack</div>
              <div className="text-white/60 text-xs uppercase tracking-[0.4em] font-bold">Pays 3 to 2</div>
           </div>
        </div>

        {/* Action Board (ActionBar) */}
        {(phase === 'dealing' || phase === 'action' || phase === 'dealer' || phase === 'payout') && (
          <div className="z-20 w-full max-w-2xl bg-casino-edge border-t-2 border-gold rounded-t-3xl p-6 flex justify-around items-center absolute bottom-0 left-1/2 -translate-x-1/2 action-bar-shadow">
            <div className="flex flex-col items-center">
              <button 
                disabled={phase !== 'action'}
                onClick={handleStand}
                className="w-20 h-20 rounded-full border-4 border-red-800 bg-red-600 hover:bg-red-500 shadow-lg flex flex-col items-center justify-center group transition-all active:scale-95 disabled:opacity-30"
              >
                <span className="text-xs font-black uppercase tracking-tighter">Stand</span>
              </button>
            </div>
            <div className="flex flex-col items-center scale-110">
              <button 
                disabled={phase !== 'action'}
                onClick={handleHit}
                className="w-24 h-24 rounded-full border-4 border-blue-800 bg-blue-600 hover:bg-blue-500 shadow-xl flex flex-col items-center justify-center group transition-all active:scale-95 disabled:opacity-30"
              >
                <span className="text-sm font-black uppercase tracking-tighter">Hit</span>
              </button>
            </div>
            <div className="flex flex-col items-center">
              <button 
                disabled={phase !== 'action' || players[activePlayerIdx]?.hand.length > 2 || players[activePlayerIdx]?.balance < players[activePlayerIdx]?.currentBet}
                onClick={handleDoubleDown}
                className="w-20 h-20 rounded-full border-4 border-yellow-800 bg-yellow-600 hover:bg-yellow-500 shadow-lg flex flex-col items-center justify-center group transition-all active:scale-95 disabled:opacity-30"
              >
                <span className="text-[10px] font-black uppercase tracking-tighter leading-none text-center">Double<br/>Down</span>
              </button>
            </div>
            
            <div className="h-12 w-px bg-gold/30 mx-2"></div>
            <div className="flex flex-col">
              <div className="text-[10px] text-gold uppercase font-bold">Shoe Status</div>
              <div className="text-sm font-mono">{Math.floor((deck.length / (6*52)) * 100)}% Cards</div>
              <div className="text-[10px] text-gray-400">6-Deck Shoe</div>
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
                        className={`py-3 rounded-xl border transition-all ${setupConfig.count === n ? 'bg-gold text-casino-dark border-gold font-bold shadow-[0_0_15px_rgba(197,160,89,0.5)]' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
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

          {/* BETTING PHASE */}
          {phase === 'betting' && (
            <motion.div 
               key="betting"
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               className="max-w-md w-full bg-casino-edge/90 backdrop-blur-xl p-8 rounded-3xl border-2 border-gold/30 text-center shadow-2xl"
            >
              <Coins className="mx-auto text-gold mb-4" size={40} />
              <h2 className="text-xs text-gold font-bold uppercase tracking-[0.3em] mb-2">Place Your Bets</h2>
              <div className="flex items-center justify-center gap-2 mb-8">
                <span className="text-2xl font-serif text-white italic">{players[activePlayerIdx]?.name}</span>
              </div>

              <div className="mb-8 p-4 bg-black/20 rounded-2xl border border-white/5">
                 <div className="text-[10px] text-white/40 uppercase font-black tracking-widest mb-1">Your Bankroll</div>
                 <div className="text-3xl font-mono text-gold">${players[activePlayerIdx]?.balance}</div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 {[10, 25, 50, 100, 250, 500].map(val => (
                   <button
                    key={val}
                    disabled={players[activePlayerIdx]?.balance < val}
                    onClick={() => handleBet(val)}
                    className="py-4 border border-white/10 rounded-2xl bg-white/5 hover:bg-gold hover:text-casino-dark transition-all flex flex-col items-center disabled:opacity-20 disabled:hover:bg-white/5 disabled:hover:text-white group"
                   >
                     <span className="text-[10px] opacity-50 uppercase font-bold group-hover:opacity-100">Bet</span>
                     <span className="text-xl font-mono">${val}</span>
                   </button>
                 ))}
              </div>
            </motion.div>
          )}

          {/* GAME TABLE */}
          {(phase === 'dealing' || phase === 'action' || phase === 'dealer' || phase === 'payout') && (
            <div key="table" className="w-full max-w-7xl h-full flex flex-col justify-between py-8">
              
              {/* Dealer Area */}
              <div className="flex flex-col items-center mb-12">
                <div className="text-gold uppercase tracking-[0.3em] text-xs font-bold mb-4">Dealer Stands on 17</div>
                <div className="flex justify-center min-h-[144px]">
                   {dealer.hand.map((card, idx) => (
                     <CardView key={card.id} card={card} index={idx} isDealer />
                   ))}
                </div>
                {dealer.hand.length > 0 && phase !== 'dealing' && (
                  <div className="mt-8 px-4 py-1 bg-black/40 backdrop-blur rounded-full border border-white/10 text-xs uppercase tracking-widest font-bold">
                    Dealer Score: <span className="text-gold font-mono ml-2">{dealer.score}</span>
                  </div>
                )}
              </div>

              {/* Message Box */}
              <div className="h-8 flex items-center justify-center">
                 {message && (
                   <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }} 
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-gold text-casino-dark font-black px-6 py-2 rounded-full shadow-[0_0_20px_rgba(197,160,89,0.3)] text-xs uppercase tracking-widest"
                   >
                     {message}
                   </motion.div>
                 )}
              </div>

              {/* Players Area */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-12 gap-y-16 mt-16 px-12 pb-12">
                {players.map((player, idx) => (
                  <div key={player.id} className={`flex flex-col items-center transition-all duration-500 ${activePlayerIdx === idx ? 'scale-110' : 'opacity-90 grayscale-[20%]'}`}>
                    <div className="flex justify-center min-h-[96px] mb-12">
                       {player.hand.map((card, cIdx) => (
                         <CardView key={card.id} card={card} index={cIdx} />
                       ))}
                    </div>

                    <div className={`px-4 py-3 rounded-2xl border w-full text-center transition-all duration-300 ${activePlayerIdx === idx ? 'bg-black/60 border-gold shadow-[0_0_15px_rgba(197,160,89,0.3)]' : 'bg-black/40 border-white/10'}`}>
                       <div className="text-[10px] uppercase font-black tracking-widest mb-1" style={{ color: activePlayerIdx === idx ? 'var(--color-gold)' : 'rgba(255,255,255,0.4)' }}>
                          {activePlayerIdx === idx ? 'Active Turn' : player.status === 'blackjack' ? 'Natural BJ' : player.status === 'bust' ? 'Busted' : 'Waiting'}
                       </div>
                       <div className="font-bold text-sm tracking-widest">{player.name}</div>
                       <div className="text-xs text-white/50 font-mono mt-1">${Math.floor(player.balance)}</div>
                       <div className={`mt-2 inline-block px-3 py-1 rounded-full text-[10px] font-black tracking-widest ${activePlayerIdx === idx ? 'bg-gold text-casino-dark' : 'bg-white/5 text-white/40'}`}>
                         BET: ${player.currentBet}
                       </div>
                       {player.hand.length > 0 && (
                          <div className="mt-2 text-xs font-black text-gold">Score: {player.score}</div>
                       )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Action UI is handled by ActionBar above */}

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
                              <th className="pb-4">Status</th>
                              <th className="pb-4 text-right">Bankroll</th>
                            </tr>
                          </thead>
                          <tbody className="font-mono">
                            {players.map(p => (
                              <tr key={p.id} className="border-b border-white/5">
                                <td className="py-4 font-serif text-sm tracking-widest text-white italic">{p.name}</td>
                                <td className="py-4">
                                  <span className={`text-[10px] font-black tracking-widest px-2 py-1 rounded-full ${
                                    p.status === 'bust' ? 'bg-red-900/50 text-red-400' :
                                    p.status === 'blackjack' ? 'bg-gold/20 text-gold shadow-[0_0_10px_rgba(197,160,89,0.2)]' :
                                    (dealer.score > 21 || p.score > dealer.score) ? 'bg-green-900/50 text-green-400' :
                                    p.score === dealer.score ? 'bg-white/5 text-white/40' : 'bg-red-900/50 text-red-400'
                                  }`}>
                                    {p.status === 'bust' ? 'BUST' : 
                                     p.status === 'blackjack' ? 'BLACKJACK' :
                                     (dealer.score > 21 || p.score > dealer.score) ? 'WINNER' :
                                     p.score === dealer.score ? 'PUSH' : 'LOSS'}
                                  </span>
                                </td>
                                <td className="py-4 text-right text-gold font-bold">${Math.floor(p.balance)}</td>
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
                            onClick={() => setPhase('setup')}
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

      {/* Footer Info */}
      <footer className="h-10 flex items-center justify-center px-6 bg-casino-dark z-10">
        <p className="text-[10px] uppercase tracking-[0.4em] text-gold/30 font-black">
          Prestige Gaming Experience • Est. 2026
        </p>
      </footer>
    </div>
  );
}

