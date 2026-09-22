import { describe, it, expect } from 'vitest';
import { isInternalNavLink, type LinkInfo } from '../../src/lib/ui/loading';

const SITE = 'https://qayra.in';

function link(partial: Partial<LinkInfo>): LinkInfo {
  return {
    href: 'https://qayra.in/scents',
    target: '',
    download: false,
    protocol: 'https:',
    origin: 'https://qayra.in',
    ...partial,
  };
}

describe('isInternalNavLink', () => {
  it('returns true for same-origin http(s) link', () => {
    expect(isInternalNavLink(link({}), SITE)).toBe(true);
  });
  it('returns false for cross-origin link', () => {
    expect(isInternalNavLink(link({ origin: 'https://other.com' }), SITE)).toBe(false);
  });
  it('returns false for target=_blank', () => {
    expect(isInternalNavLink(link({ target: '_blank' }), SITE)).toBe(false);
  });
  it('treats target=_self as internal', () => {
    expect(isInternalNavLink(link({ target: '_self' }), SITE)).toBe(true);
  });
  it('returns false for download attribute', () => {
    expect(isInternalNavLink(link({ download: true }), SITE)).toBe(false);
  });
  it('returns false for mailto:', () => {
    expect(isInternalNavLink(link({ protocol: 'mailto:', origin: '' }), SITE)).toBe(false);
  });
  it('returns false for tel:', () => {
    expect(isInternalNavLink(link({ protocol: 'tel:', origin: '' }), SITE)).toBe(false);
  });
  it('returns false when href is empty', () => {
    expect(isInternalNavLink(link({ href: '' }), SITE)).toBe(false);
  });
});
