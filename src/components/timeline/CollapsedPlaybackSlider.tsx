import { memo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { translations } from '../../i18n/translations';
import { formatMilliseconds } from '../../i18n/terminology';

export const CollapsedPlaybackSlider = memo(({ maxTime, disabled = false }: { maxTime: number; disabled?: boolean }) => {
  const language = useAppStore(s => s.language);
  const currentTime = useAppStore(s => s.currentTime);
  return <input type="range" disabled={disabled} aria-label={translations[language].timelineUi.seek} aria-valuetext={formatMilliseconds(currentTime, language)}
    step={1} min={0} max={maxTime} value={currentTime}
    onChange={event => { const state = useAppStore.getState(); state.pausePlayback(); state.setCurrentTime(Number(event.target.value)); }}
    className="yada-playback-seek" />;
});
CollapsedPlaybackSlider.displayName = 'CollapsedPlaybackSlider';
