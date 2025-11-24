export type ConstellationId =
| "aries"
| "taurus"
| "gemini"
| "cancer"
| "leo"
| "virgo"
| "libra"
| "scorpio"
| "sagittarius"
| "capricorn"
| "aquarius"
| "pisces";


export const CONSTELLATION_IDS: ConstellationId[] = [
"aries",
"taurus",
"gemini",
"cancer",
"leo",
"virgo",
"libra",
"scorpio",
"sagittarius",
"capricorn",
"aquarius",
"pisces",
];


/**
* Constellation difficulty ramp.
* Phase 6 uses this for pulse-length defaults.
* Later, you’ll override per constellation with real song/melody mapping.
*/
export const CONSTELLATION_PULSE_LENGTHS: Record<ConstellationId, number> = {
aries: 2,
taurus: 4,
gemini: 5,
cancer: 6,
leo: 7,
virgo: 8,
libra: 9,
scorpio: 10,
sagittarius: 11,
capricorn: 12,
aquarius: 13,
pisces: 14,
};