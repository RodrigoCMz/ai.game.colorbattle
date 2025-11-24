import React from 'react';
import { PlayerId, ToolType } from '../types';
import { TOOLS, MAX_ENERGY } from '../constants';
import { CircleDot, Zap, Flame, Truck, Bomb, Crosshair, Shield, Bot } from 'lucide-react';

interface ControlPanelProps {
  player: PlayerId;
  energy: number;
  selectedTool: ToolType;
  onSelectTool: (t: ToolType) => void;
  isCpu: boolean;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ player, energy, selectedTool, onSelectTool, isCpu }) => {
  const isP1 = player === PlayerId.P1;

  const getIcon = (iconName: string, size = 24) => {
    switch(iconName) {
        case 'Bomb': return <Bomb size={size} />;
        case 'Crosshair': return <Crosshair size={size} />;
        case 'Flame': return <Flame size={size} />;
        case 'Shield': return <Shield size={size} />;
        case 'CircleDot': return <CircleDot size={size} />; // Fallback
        default: return <CircleDot size={size} />;
    }
  };

  return (
    <div className={`relative flex flex-col gap-2 p-3 bg-gray-900/90 rounded-xl border-2 shadow-2xl backdrop-blur-sm pointer-events-auto h-full w-full max-w-sm transition-all duration-300 ${isP1 ? 'border-red-500/50' : 'border-blue-500/50'}`}>
      
      {isCpu && (
          <div className="absolute inset-0 z-20 bg-black/50 backdrop-blur-[1px] rounded-lg flex items-center justify-center pointer-events-none">
              <div className="bg-gray-900 border border-gray-600 px-4 py-2 rounded-full flex items-center gap-2 shadow-xl">
                  <Bot size={16} className={isP1 ? "text-red-400" : "text-blue-400"} />
                  <span className="text-xs font-mono text-white tracking-widest">CPU AUTO-PILOT</span>
              </div>
          </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-1">
        <h2 className={`text-lg font-black uppercase tracking-wider ${isP1 ? 'text-red-500' : 'text-blue-500'}`}>
          {isP1 ? 'RED' : 'BLUE'}
        </h2>
        <div className="flex flex-col items-end leading-none">
            <span className="text-[10px] text-gray-400">ENERGY</span>
            <div className="text-2xl font-mono font-bold text-yellow-400 drop-shadow-lg">
                {Math.floor(energy)}
                <span className="text-xs text-yellow-600 ml-1">/{MAX_ENERGY}</span>
            </div>
        </div>
      </div>

      {/* Energy Bar */}
      <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden border border-gray-700 shrink-0">
        <div 
            className={`h-full transition-all duration-200 ease-linear ${isP1 ? 'bg-gradient-to-r from-red-800 to-red-500' : 'bg-gradient-to-r from-blue-800 to-blue-500'}`}
            style={{ width: `${(energy / MAX_ENERGY) * 100}%` }}
        />
      </div>

      {/* Tools Grid - Icon Left, Text Right Layout */}
      <div className="grid grid-cols-2 gap-2 mt-2 flex-grow min-h-0">
        {Object.values(TOOLS).map((tool) => {
            const isSelected = selectedTool === tool.id;
            const canAfford = energy >= tool.cost;
            
            return (
                <button
                    key={tool.id}
                    onClick={() => onSelectTool(tool.id)}
                    className={`
                        relative flex flex-row items-center p-2 rounded-lg border-2 transition-all overflow-hidden h-14
                        ${isSelected 
                            ? (isP1 ? 'border-red-500 bg-red-500/20' : 'border-blue-500 bg-blue-500/20') 
                            : 'border-gray-700 bg-gray-800/50 hover:bg-gray-700'
                        }
                        ${!canAfford && !isSelected ? 'opacity-50 grayscale cursor-not-allowed' : 'opacity-100'}
                    `}
                    disabled={!canAfford && !isSelected || isCpu} 
                >
                    <div className={`shrink-0 mr-3 flex items-center justify-center w-8 ${isSelected ? 'text-white' : 'text-gray-400'}`}>
                        {getIcon(tool.icon)}
                    </div>
                    
                    <div className="flex flex-col items-start min-w-0">
                        <span className="text-[11px] font-bold uppercase truncate w-full leading-tight">{tool.name}</span>
                        <span className="text-[10px] font-mono text-yellow-400 inline-block">
                            ⚡ {tool.cost}
                        </span>
                    </div>
                </button>
            );
        })}
      </div>

      <div className="text-[10px] text-gray-500 text-center border-t border-gray-700 pt-1 truncate">
         {isP1 ? 'Left Click to Deploy' : 'Right Click to Deploy'}
      </div>
    </div>
  );
};

export default ControlPanel;