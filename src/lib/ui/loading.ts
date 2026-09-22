export interface LinkInfo {
  href: string;
  target: string;
  download: boolean;
  protocol: string;
  origin: string;
}

export function isInternalNavLink(info: LinkInfo, currentOrigin: string): boolean {
  if (!info.href) return false;
  if (info.target && info.target !== '_self') return false;
  if (info.download) return false;
  if (info.protocol !== 'http:' && info.protocol !== 'https:') return false;
  return info.origin === currentOrigin;
}

export function readLinkInfo(a: HTMLAnchorElement): LinkInfo {
  return {
    href: a.getAttribute('href') ?? '',
    target: a.target ?? '',
    download: a.hasAttribute('download'),
    protocol: a.protocol,
    origin: a.origin,
  };
}
