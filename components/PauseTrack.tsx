
import React from 'react';
import { PauseItem } from '../types';
import { TrashIcon, PauseCircleIcon } from './Icons';

interface PauseTrackProps {
  item: PauseItem;
  onDelete: () => void;
  onDurationChange: (duration: number) => void;
}

export const PauseTrack: React.FC<PauseTrackProps> = ({ item, onDelete, onDurationChange }) => {
  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value >= 0) {
      onDurationChange(value);
    }
  };

  return (
    <div className="flex items-center bg-gray-900/50 border border-dashed border-gray-600 p-3 rounded-lg shadow transition-shadow hover:shadow-lg hover:bg-gray-800">
      <div className="flex items-center gap-3 flex-grow">
        <div className="text-gray-500">
            <PauseCircleIcon />
        </div>
        <div className="flex-1 flex items-center gap-2">
            <label htmlFor={`pause-${item.id}`} className="font-medium text-gray-300">Pause:</label>
            <input
                id={`pause-${item.id}`}
                type="number"
                value={item.duration}
                onChange={handleDurationChange}
                min="0"
                step="0.1"
                className="w-20 bg-gray-700 text-white rounded-md px-2 py-1 text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <span className="text-gray-400">seconds</span>
        </div>
      </div>
      <div className="flex items-center gap-2 ml-4">
        <button onClick={onDelete} className="p-2 text-gray-400 hover:text-red-500 hover:bg-gray-600 rounded-full transition-colors" title="Delete">
          <TrashIcon />
        </button>
      </div>
    </div>
  );
};
