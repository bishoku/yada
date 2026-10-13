import { isForge } from './forgeBridge';
import { isConfluenceDC } from './confluenceDcBridge';

/** Runtime policy shared by controls and action boundaries; never persisted in diagrams. */
export function getPlatformCapabilities() {
  const isConfluence = isForge() || isConfluenceDC();
  return {
    canCollaborate: !isConfluence,
    canCreateDiagram: !isConfluence,
  };
}

export function assertCanCreateDiagram() {
  if (!getPlatformCapabilities().canCreateDiagram) {
    throw new Error('Diagram creation is unavailable in Confluence.');
  }
}

export function assertCanCollaborate() {
  if (!getPlatformCapabilities().canCollaborate) {
    throw new Error('Live collaboration is unavailable in Confluence.');
  }
}
