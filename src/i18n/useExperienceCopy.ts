import { useAppStore } from '../store/useAppStore';
import { experienceCopy } from './experienceCopy';
export function useExperienceCopy() { return experienceCopy[useAppStore(state => state.language)]; }
