import { useAppStore } from '../store/useAppStore';
import { uiCopy } from './uiCopy';

export function useUiCopy() {
  return uiCopy[useAppStore(state => state.language)];
}
