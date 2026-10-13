import type { WorkspaceMeta } from '../../types';

export type AppRoute = { kind: 'home' } | { kind: 'workspace'; workspace: string } | { kind: 'diagram'; workspace: string; diagram: string; view: 'freeform' | 'sequence' };

/** Stable opaque identifiers keep local filesystem paths out of browser URLs. */
export function workspaceRouteId(workspace: Pick<WorkspaceMeta, 'path'>): string {
  let hash = 0xcbf29ce484222325n;
  for (const character of workspace.path) hash = BigInt.asUintN(64, (hash ^ BigInt(character.codePointAt(0)!)) * 0x100000001b3n);
  return `w${hash.toString(16).padStart(16, '0')}`;
}
export function encodeRoute(route: AppRoute): string {
  const params = new URLSearchParams({ yada: route.kind });
  if (route.kind !== 'home') params.set('w', route.workspace);
  if (route.kind === 'diagram') { params.set('d', route.diagram); params.set('view', route.view); }
  return `#${params}`;
}
export function decodeRoute(hash: string): AppRoute | null {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  if (params.has('share') || params.has('ref') || params.has('collab')) return null;
  const kind = params.get('yada');
  if (kind === 'home') return { kind };
  const workspace = params.get('w');
  if (!workspace || !/^w[0-9a-f]{16}$/.test(workspace)) return null;
  if (kind === 'workspace') return { kind, workspace };
  const diagram = params.get('d'), view = params.get('view') ?? 'freeform';
  if (kind !== 'diagram' || !diagram || diagram.length > 500 || (view !== 'freeform' && view !== 'sequence')) return null;
  return { kind, workspace, diagram, view };
}
export function sameRoute(a: AppRoute, b: AppRoute) { return encodeRoute(a) === encodeRoute(b); }

export function hostOwnsNavigation(search: string): boolean {
  const params = new URLSearchParams(search);
  return ['embed', 'embed_editor'].some(key => ['true', '1'].includes(params.get(key) ?? '')) || params.get('integration') === 'iframe' || ['modal', 'embed'].includes(params.get('mode') ?? '');
}
