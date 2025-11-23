export type EventHandler<T = any> = (payload: T) => void;


export class EventBus {
private handlers: Map<string, Set<EventHandler>> = new Map();


public on<T = any>(event: string, handler: EventHandler<T>): () => void {
if (!this.handlers.has(event)) this.handlers.set(event, new Set());
this.handlers.get(event)!.add(handler as EventHandler);
return () => this.off(event, handler);
}


public off<T = any>(event: string, handler: EventHandler<T>): void {
const set = this.handlers.get(event);
if (!set) return;
set.delete(handler as EventHandler);
if (set.size === 0) this.handlers.delete(event);
}


public emit<T = any>(event: string, payload?: T): void {
const set = this.handlers.get(event);
if (!set) return;
for (const handler of set) handler(payload as T);
}


public clear(): void {
this.handlers.clear();
}
}