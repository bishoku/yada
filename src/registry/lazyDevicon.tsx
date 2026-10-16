import React, { Suspense, lazy } from 'react';

type IconModule = { default: React.ComponentType<any> };
const preloaders = new WeakMap<React.ComponentType<any>, () => Promise<IconModule>>();

class IconBoundary extends React.Component<React.PropsWithChildren<{ fallback: React.ReactNode; retry: () => void }>, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  private online = () => { if (this.state.failed) this.props.retry(); };
  componentDidMount() { window.addEventListener('online', this.online); }
  componentWillUnmount() { window.removeEventListener('online', this.online); }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

/** Each SVG variant loads only when rendered; its box stays stable while loading. */
export function lazyDevicon(loader: () => Promise<IconModule>): React.ComponentType<any> {
  let pending: Promise<IconModule> | undefined;
  const load = () => pending ??= loader().catch(error => { pending = undefined; throw error; });
  let Icon = lazy(load);
  const Component = (props: { size?: number | string }) => {
    const [generation, retry] = React.useReducer((value: number) => value + 1, 0);
    const placeholder = <span aria-hidden="true" className="inline-block rounded bg-current opacity-10" style={{ width: props.size ?? 24, height: props.size ?? 24 }} />;
    return <IconBoundary key={generation} fallback={placeholder} retry={() => { Icon = lazy(load); retry(); }}><Suspense fallback={placeholder}><Icon {...props} /></Suspense></IconBoundary>;
  };
  preloaders.set(Component, load);
  return Component;
}

export async function preloadDevicon(component: React.ComponentType<any> | null) {
  if (component) await preloaders.get(component)?.();
}
