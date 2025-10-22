import React from 'react';
import { formatTime } from '../utils/audioUtils';

interface ProgressProps {
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
}

export const Progress: React.FC<ProgressProps> = ({ currentTime, duration, onSeek }) => {
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSeek(parseFloat(e.target.value));
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex items-center gap-3 w-full">
      <span className="text-xs text-gray-400 font-mono w-14 text-right">{formatTime(currentTime)}</span>
      <div className="relative w-full h-2">
        <input
          type="range"
          min="0"
          max={duration || 0}
          step="0.01"
          value={currentTime}
          onChange={handleSeek}
          className="absolute w-full h-2 bg-transparent appearance-none cursor-pointer group"
          style={{ zIndex: 2 }} // Ensure slider thumb is on top
          disabled={!duration}
        />
        <div className="absolute top-0 left-0 h-2 bg-gray-600 rounded-lg w-full" style={{ zIndex: 1 }}>
            <div 
                className="h-2 bg-indigo-500 rounded-lg" 
                style={{ width: `${progressPercent}%`}}
            />
        </div>
      </div>
      <span className="text-xs text-gray-400 font-mono w-14 text-left">{formatTime(duration)}</span>
    </div>
  );
};
