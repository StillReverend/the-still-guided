import { Entry } from "./apps/Entry";


const entry = new Entry();
entry.start();


// Expose for dev debugging (remove in prod builds if desired)
// @ts-ignore
window.__THE_STILL__ = entry;