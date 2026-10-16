/** Only the standalone home route can skip the initial editor loading boundary. */
export function canPreloadWelcome(href: string, topLevel: boolean, native: boolean, hostedBuild: boolean) {
  if (!topLevel || native || hostedBuild) return false;
  const url=new URL(href);
  if (/(?:^|[?#&])(?:share|ref|collab|embed|integration|mode|target)=/.test(url.search+url.hash)) return false;
  return !url.hash || url.hash==='#yada=home';
}
