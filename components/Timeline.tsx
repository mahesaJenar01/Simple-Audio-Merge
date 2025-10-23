import React from 'react';
import { TimelineItem } from '../types';
import { AudioTrack } from './AudioTrack';
import { PauseTrack } from './PauseTrack';
import { EmptyTimelineIcon } from './Icons';

type TrackInstance = { stop: () => void };

interface TimelineProps {
  items: TimelineItem[];
  onDeleteItem: (id: string) => void;
  onDuplicateItem: (id: string) => void;
  onUpdatePause: (id: string, duration: number) => void;
  onInsertPause: (index: number, position: 'above' | 'below') => void;
  onSetTrackRef: (id: string, instance: TrackInstance | null) => void;
  onTrackPlay: (id: string) => void;
  onMoveItem: (id: string, steps: number) => void;
}

export const Timeline: React.FC<TimelineProps> = ({
  items,
  onDeleteItem,
  onDuplicateItem,
  onUpdatePause,
  onInsertPause,
  onSetTrackRef,
  onTrackPlay,
  onMoveItem,
}) => {
  return (
    <div className="flex flex-col h-full">
      <h2 className="text-xl font-semibold text-white mb-4 flex-shrink-0">Timeline</h2>
      {items.length === 0 ? (
        <div className="flex-grow flex flex-col items-center justify-center text-center text-gray-500 border-2 border-dashed border-gray-700 rounded-lg">
          <EmptyTimelineIcon />
          <p className="mt-4 text-lg font-medium">Your timeline is empty</p>
          <p className="text-sm">Upload audio or add pauses to get started.</p>
        </div>
      ) : (
        <div 
          className="flex-grow overflow-y-auto pr-2 -mr-2"
        >
          <div className="space-y-3">
            {items.map((item, index) => (
              <div key={item.id}>
                {item.type === 'audio' ? (
                  <AudioTrack
                    ref={(el) => onSetTrackRef(item.id, el)}
                    item={item}
                    index={index}
                    totalItems={items.length}
                    onDelete={() => onDeleteItem(item.id)}
                    onDuplicate={() => onDuplicateItem(item.id)}
                    onInsertPause={(position) => onInsertPause(index, position)}
                    onPlay={() => onTrackPlay(item.id)}
                    onMoveItem={(steps) => onMoveItem(item.id, steps)}
                  />
                ) : (
                  <PauseTrack
                    item={item}
                    index={index}
                    totalItems={items.length}
                    onDelete={() => onDeleteItem(item.id)}
                    onDurationChange={(duration) => onUpdatePause(item.id, duration)}
                    onMoveItem={(steps) => onMoveItem(item.id, steps)}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};