import { useAppStore } from '../store/useAppStore';
import { translations } from './translations';

/** Subscribe only to language, never to document or playback updates. */
export function useTranslation() {
  return translations[useAppStore(state => state.language)];
}
