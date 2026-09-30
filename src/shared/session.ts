const SESSION_KEY = 'sid';

export function readSessionId(): string {
  const fromUrl = new URLSearchParams(window.location.search).get(SESSION_KEY)?.trim();
  try {
    if (fromUrl) {
      localStorage.setItem(SESSION_KEY, fromUrl);
      return fromUrl;
    }
    return localStorage.getItem(SESSION_KEY) ?? '';
  } catch {
    return fromUrl ?? '';
  }
}

export function saveSessionId(value: string): void {
  const sessionId = value.trim();
  if (sessionId) localStorage.setItem(SESSION_KEY, sessionId);
  else localStorage.removeItem(SESSION_KEY);
}
