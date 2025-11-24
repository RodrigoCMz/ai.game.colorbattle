import React, { useState } from 'react';
import GameCanvas from './components/GameCanvas';
import ControlPanel from './components/ControlPanel';
import { PlayerId, ToolType, GameState, PlayerType } from './types';
import { INITIAL_ENERGY, GAME_DURATION } from './constants';
import { Trophy, Timer, Bot, User } from 'lucide-react';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<Partial<GameState>>({
    p1Energy: INITIAL_ENERGY,
    p2Energy: INITIAL_ENERGY,
    timeRemaining: GAME_DURATION,
    winner: null,
  });

  const [p1Tool, setP1Tool] = useState<ToolType>(ToolType.CANNON);
  const [p2Tool, setP2Tool] = useState<ToolType>(ToolType.CANNON);
  
  // Player Type Configuration
  const [p1Type, setP1Type] = useState<PlayerType>('PLAYER');
  const [p2Type, setP2Type] = useState<PlayerType>('CPU');

  const [gameActive, setGameActive] = useState(false);
  const [gameOverInfo, setGameOverInfo] = useState<{ winner: PlayerId | 'DRAW' } | null>(null);

  const handleStateUpdate = (newState: GameState) => {
    setGameState(prev => ({
        ...prev,
        p1Energy: newState.p1Energy,
        p2Energy: newState.p2Energy,
        timeRemaining: newState.timeRemaining,
    }));
  };

  const handleGameOver = (winner: PlayerId | 'DRAW') => {
    setGameActive(false);
    setGameOverInfo({ winner });
  };

  const formatTime = (seconds: number = 0) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const startGame = () => {
    setGameOverInfo(null);
    setGameState({
        p1Energy: INITIAL_ENERGY,
        p2Energy: INITIAL_ENERGY,
        timeRemaining: GAME_DURATION,
        winner: null,
    });
    setGameActive(true);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-black text-white overflow-hidden relative selection:bg-none select-none">
      
      {/* Top Bar / Scoreboard - Absolute Overlay to save space */}
      <div className="absolute top-0 left-0 w-full h-16 pointer-events-none z-30 flex justify-center items-start pt-2">
        <div className="bg-gray-900/90 border border-gray-700 backdrop-blur rounded-full px-6 py-2 flex items-center gap-6 shadow-xl">
            <div className="flex items-center gap-2 text-red-500">
                <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
                <span className="font-bold tracking-widest text-sm">RED</span>
            </div>
            
            <div className="flex items-center gap-2 text-xl font-mono font-bold text-white min-w-[80px] justify-center">
                <Timer className="w-4 h-4 text-gray-400" />
                {formatTime(gameState.timeRemaining)}
            </div>

            <div className="flex items-center gap-2 text-blue-500">
                <span className="font-bold tracking-widest text-sm">BLUE</span>
                <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse"></div>
            </div>
        </div>
      </div>

      {/* Main Game Area */}
      <div className="flex-1 min-h-0 relative flex items-center justify-center bg-gray-900">
        <GameCanvas 
            p1Tool={p1Tool}
            p2Tool={p2Tool}
            p1Type={p1Type}
            p2Type={p2Type}
            onStateUpdate={handleStateUpdate}
            gameActive={gameActive}
            onGameOver={handleGameOver}
        />

        {/* Start / Game Over Screen Overlay */}
        {(!gameActive) && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
                <div className="bg-gray-800 border-2 border-gray-600 p-8 rounded-2xl shadow-2xl max-w-md w-full text-center">
                    {gameOverInfo ? (
                        <>
                            <Trophy className={`w-20 h-20 mx-auto mb-4 ${gameOverInfo.winner === PlayerId.P1 ? 'text-red-500' : gameOverInfo.winner === PlayerId.P2 ? 'text-blue-500' : 'text-gray-400'}`} />
                            <h1 className="text-4xl font-black mb-2 uppercase text-white">
                                {gameOverInfo.winner === 'DRAW' ? 'DRAW!' : `${gameOverInfo.winner === PlayerId.P1 ? 'RED' : 'BLUE'} WINS!`}
                            </h1>
                            <p className="text-gray-400 mb-6">Territory domination achieved.</p>
                        </>
                    ) : (
                        <>
                            <div className="flex justify-center gap-4 mb-4">
                                <div className="w-16 h-16 bg-red-500 rounded-lg transform -rotate-6"></div>
                                <div className="w-16 h-16 bg-blue-500 rounded-lg transform rotate-6 z-10 -ml-8 border-4 border-gray-800"></div>
                            </div>
                            <h1 className="text-4xl font-black mb-2 text-white italic">COLOR CLASH</h1>
                            <p className="text-gray-300 mb-6 text-sm">
                                2 Players • 3 Minutes • 98% Domination<br/>
                                <span className="opacity-60 text-xs">Place turrets to paint the arena.</span>
                            </p>

                            {/* Player Config Toggles */}
                            <div className="flex gap-4 mb-6">
                                <div className="flex-1 bg-gray-900/50 p-3 rounded-lg border border-red-500/30">
                                    <h3 className="text-red-500 font-bold text-sm mb-2 uppercase">Red Team</h3>
                                    <div className="flex rounded bg-gray-800 p-1">
                                        <button 
                                            className={`flex-1 py-1 text-xs rounded flex items-center justify-center gap-1 ${p1Type === 'PLAYER' ? 'bg-red-500 text-white' : 'text-gray-400 hover:text-white'}`}
                                            onClick={() => setP1Type('PLAYER')}
                                        >
                                            <User size={12} /> Player
                                        </button>
                                        <button 
                                            className={`flex-1 py-1 text-xs rounded flex items-center justify-center gap-1 ${p1Type === 'CPU' ? 'bg-red-500 text-white' : 'text-gray-400 hover:text-white'}`}
                                            onClick={() => setP1Type('CPU')}
                                        >
                                            <Bot size={12} /> CPU
                                        </button>
                                    </div>
                                </div>
                                <div className="flex-1 bg-gray-900/50 p-3 rounded-lg border border-blue-500/30">
                                    <h3 className="text-blue-500 font-bold text-sm mb-2 uppercase">Blue Team</h3>
                                    <div className="flex rounded bg-gray-800 p-1">
                                        <button 
                                            className={`flex-1 py-1 text-xs rounded flex items-center justify-center gap-1 ${p2Type === 'PLAYER' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'}`}
                                            onClick={() => setP2Type('PLAYER')}
                                        >
                                            <User size={12} /> Player
                                        </button>
                                        <button 
                                            className={`flex-1 py-1 text-xs rounded flex items-center justify-center gap-1 ${p2Type === 'CPU' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'}`}
                                            onClick={() => setP2Type('CPU')}
                                        >
                                            <Bot size={12} /> CPU
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                    
                    <button 
                        onClick={startGame}
                        className="w-full py-4 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl font-bold text-black text-xl hover:scale-105 transition-transform shadow-lg shadow-orange-500/20"
                    >
                        {gameOverInfo ? 'PLAY AGAIN' : 'START MATCH'}
                    </button>
                </div>
            </div>
        )}
      </div>

      {/* Bottom Controls Container */}
      <div className="h-[240px] shrink-0 bg-gray-950 border-t border-gray-800 flex relative z-20">
        {/* P1 Controls (Left) */}
        <div className="w-1/2 p-2 flex justify-center items-center border-r border-gray-800 bg-gradient-to-tr from-red-900/10 to-transparent">
            <ControlPanel 
                player={PlayerId.P1} 
                energy={gameState.p1Energy || 0} 
                selectedTool={p1Tool} 
                onSelectTool={setP1Tool} 
                isCpu={p1Type === 'CPU'}
            />
        </div>

        {/* P2 Controls (Right) */}
        <div className="w-1/2 p-2 flex justify-center items-center bg-gradient-to-tl from-blue-900/10 to-transparent">
            <ControlPanel 
                player={PlayerId.P2} 
                energy={gameState.p2Energy || 0} 
                selectedTool={p2Tool} 
                onSelectTool={setP2Tool} 
                isCpu={p2Type === 'CPU'}
            />
        </div>
        
        {/* VS Divider */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gray-900 border border-gray-700 text-gray-500 font-bold px-3 py-1 rounded-full text-xs z-30 shadow-lg">
            VS
        </div>
      </div>
    </div>
  );
};

export default App;