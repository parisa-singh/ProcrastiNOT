import React from "react";

interface XPDisplayProps {
  xp: number;
  level: number;
  progress: number;
}

const XPDisplay: React.FC<XPDisplayProps> = ({ xp, level, progress }) => {
  return (
    <div className="flex flex-col items-center justify-center gap-1">
      <div className="flex items-center gap-2 text-indigo-300 font-semibold">
        🚀 <span>Rocket Fuel: {xp} XP</span>
      </div>
      <div className="w-40 bg-slate-800 rounded-full h-3 overflow-hidden">
        <div
          className="bg-indigo-500 h-full transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-sm text-slate-400">Level {level}</p>
    </div>
  );
};

export default XPDisplay;
