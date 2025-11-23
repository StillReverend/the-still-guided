export class Time {
private last = performance.now();


public tick(): number {
const now = performance.now();
const dtMs = now - this.last;
this.last = now;
return dtMs / 1000; // seconds
}
}