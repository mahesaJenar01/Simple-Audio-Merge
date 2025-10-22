import React, { useState, useCallback, useRef, useEffect } from 'react';
import { TimelineItem, AudioItem, PauseItem } from './types';
import { getAudioDuration } from './utils/audioUtils';
import { useAudioProcessor } from './hooks/useAudioProcessor';
import { Timeline } from './components/Timeline';
import { Controls } from './components/Controls';
import { HeaderIcon } from './components/Icons';

type TrackInstance = { stop: () => void };

const App: React.FC = () => {
  const [timelineItems, setTimelineItems] = useState<TimelineItem[]>([]);
  const { 
    isLoading, 
    isPlaying, 
    mergedAudioBuffer, 
    mergeAndPlay, 
    stop: stopMerged,
    currentTime,
    duration,
    seek,
    reset: resetMergedAudio,
  } = useAudioProcessor();

  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);
  const trackRefs = useRef<Map<string, TrackInstance>>(new Map());

  useEffect(() => {
    resetMergedAudio();
  }, [timelineItems, resetMergedAudio]);

  const setTrackRef = (id: string, instance: TrackInstance | null) => {
    if (instance) {
      trackRefs.current.set(id, instance);
    } else {
      trackRefs.current.delete(id);
    }
  };

  const stopAllTrackPreviews = useCallback(() => {
    trackRefs.current.forEach(track => track.stop());
  }, []);

  const handleTrackPlay = useCallback((playedTrackId: string) => {
    stopMerged();
    trackRefs.current.forEach((track, id) => {
      if (id !== playedTrackId) {
        track.stop();
      }
    });
  }, [stopMerged]);
  
  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newAudioItems: AudioItem[] = await Promise.all(
      [...files].map(async (file) => {
        const duration = await getAudioDuration(file);
        return {
          id: crypto.randomUUID(),
          type: 'audio',
          file,
          duration,
        };
      })
    );
    setTimelineItems((prev) => [...prev, ...newAudioItems]);
     // Reset file input value to allow re-uploading the same file
    event.target.value = '';
  }, []);

  const insertPause = useCallback((index: number, position: 'above' | 'below') => {
    const newPause: PauseItem = {
      id: crypto.randomUUID(),
      type: 'pause',
      duration: 1.0,
    };
    const insertIndex = position === 'above' ? index : index + 1;
    setTimelineItems((prev) => [
      ...prev.slice(0, insertIndex),
      newPause,
      ...prev.slice(insertIndex),
    ]);
  }, []);

  const deleteItem = useCallback((id: string) => {
    setTimelineItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const duplicateItem = useCallback((id: string) => {
    const itemToDuplicate = timelineItems.find((item) => item.id === id);
    if (!itemToDuplicate) return;

    const newItem = { ...itemToDuplicate, id: crypto.randomUUID() };
    const index = timelineItems.findIndex((item) => item.id === id);
    setTimelineItems((prev) => [
      ...prev.slice(0, index + 1),
      newItem,
      ...prev.slice(index + 1),
    ]);
  }, [timelineItems]);

  const updatePauseDuration = useCallback((id: string, duration: number) => {
    setTimelineItems((prev) =>
      prev.map((item) =>
        item.id === id && item.type === 'pause' ? { ...item, duration } : item
      )
    );
  }, []);

  const handleDragSort = useCallback(() => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    if (dragItem.current === dragOverItem.current) return;
    
    const itemsCopy = [...timelineItems];
    const draggedItemContent = itemsCopy.splice(dragItem.current, 1)[0];
    itemsCopy.splice(dragOverItem.current, 0, draggedItemContent);
    dragItem.current = null;
    dragOverItem.current = null;
    setTimelineItems(itemsCopy);
  }, [timelineItems]);
  
  const handleMergeAndPlay = () => {
    stopAllTrackPreviews();
    mergeAndPlay(timelineItems);
  };

  return (
    <div className="h-screen bg-gray-900 text-gray-200 flex flex-col p-4 sm:p-6 lg:p-8 font-sans">
      <header className="flex items-center gap-3 mb-6 flex-shrink-0">
        <HeaderIcon />
        <h1 className="text-3xl font-bold text-white tracking-tight">Audio Merge Studio</h1>
      </header>
      <main className="flex-grow grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-6 min-h-0">
        <aside className="lg:col-span-1 xl:col-span-1 bg-gray-800/50 rounded-xl shadow-lg p-6 flex flex-col">
          <Controls
            onFileChange={handleFileChange}
            onMerge={handleMergeAndPlay}
            onStop={stopMerged}
            isLoading={isLoading}
            isPlaying={isPlaying}
            canMerge={timelineItems.some(item => item.type === 'audio')}
            mergedAudioBuffer={mergedAudioBuffer}
            currentTime={currentTime}
            duration={duration}
            onSeek={seek}
          />
        </aside>
        <section className="lg:col-span-2 xl:col-span-3 bg-gray-800/50 rounded-xl shadow-lg p-6 flex flex-col min-h-0">
          <Timeline
            items={timelineItems}
            onDeleteItem={deleteItem}
            onDuplicateItem={duplicateItem}
            onUpdatePause={updatePauseDuration}
            onInsertPause={insertPause}
            dragItemRef={dragItem}
            dragOverItemRef={dragOverItem}
            onDragSort={handleDragSort}
            onSetTrackRef={setTrackRef}
            onTrackPlay={handleTrackPlay}
          />
        </section>
      </main>
    </div>
  );
};

export default App;