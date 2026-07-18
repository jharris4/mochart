// Shareable chart state: the current (possibly edited) demo config and data,
// encoded as a base64url JSON payload in the URL hash. The demo id is not
// part of the payload — the URL path already carries it — so a share link is
// simply the single-demo URL plus `#share=<payload>`. Every gallery uses the
// same helpers: buildShareUrl from its share button, consumeShareState once
// while mounting a single-demo view.

import type { DataRow, DemoConfig } from './types';

export interface ShareState {
  config: DemoConfig;
  data: DataRow[];
}

export const shareHashPrefix = '#share=';

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(encoded: string): Uint8Array {
  const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function encodeShareState(state: ShareState): string {
  const json = JSON.stringify({ config: state.config, data: state.data });
  return bytesToBase64Url(new TextEncoder().encode(json));
}

/** Decode a share payload; returns null for anything malformed. */
export function decodeShareState(encoded: string): ShareState | null {
  try {
    const json = new TextDecoder().decode(base64UrlToBytes(encoded));
    const parsed: unknown = JSON.parse(json);
    if (parsed === null || typeof parsed !== 'object') {
      return null;
    }
    const { config, data } = parsed as { config?: unknown; data?: unknown };
    if (config === null || typeof config !== 'object' || Array.isArray(config) || !Array.isArray(data)) {
      return null;
    }
    if (data.some(row => row === null || typeof row !== 'object' || Array.isArray(row))) {
      return null;
    }
    return { config: config as DemoConfig, data: data as DataRow[] };
  }
  catch {
    return null;
  }
}

/** The current single-demo URL with the given state encoded in its hash. */
export function buildShareUrl(state: ShareState): string {
  const { origin, pathname, search } = window.location;
  return origin + pathname + search + shareHashPrefix + encodeShareState(state);
}

/**
 * Read and decode share state from the URL hash, then strip the hash so
 * reloads and later copies of the address stay clean. Returns null when the
 * hash carries no (valid) share payload.
 */
export function consumeShareState(): ShareState | null {
  const { hash } = window.location;
  if (!hash.startsWith(shareHashPrefix)) {
    return null;
  }
  const state = decodeShareState(hash.slice(shareHashPrefix.length));
  const { origin, pathname, search } = window.location;
  window.history.replaceState(window.history.state, '', origin + pathname + search);
  return state;
}
