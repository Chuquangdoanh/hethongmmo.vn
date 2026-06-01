type Handler = (color: string, shadow: string) => void;

const handlers = new Set<Handler>();

export function subscribeNavProgress(fn: Handler) {
  handlers.add(fn);
  return () => { handlers.delete(fn); };
}

export function emitNavProgress(color: string, shadow: string) {
  handlers.forEach((fn) => fn(color, shadow));
}
