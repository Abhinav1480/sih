/**
 * Spoken number words for TTS. 0–99 in en/te/hi/ta; decimals read digit by
 * digit after the language's "point" word; anything else falls back to English.
 */

type Table = { ones: string[]; tens: string[]; tensJoin?: string[]; point: string };

const EN: Table = {
  ones: [
    "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
    "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen",
  ],
  tens: ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"],
  point: "point",
};

const TE: Table = {
  ones: [
    "సున్నా", "ఒకటి", "రెండు", "మూడు", "నాలుగు", "ఐదు", "ఆరు", "ఏడు", "ఎనిమిది", "తొమ్మిది",
    "పది", "పదకొండు", "పన్నెండు", "పదమూడు", "పద్నాలుగు", "పదిహేను", "పదహారు", "పదిహేడు", "పద్దెనిమిది", "పందొమ్మిది",
  ],
  tens: ["", "", "ఇరవై", "ముప్పై", "నలభై", "యాభై", "అరవై", "డెబ్భై", "ఎనభై", "తొంభై"],
  point: "పాయింట్",
};

const TA: Table = {
  ones: [
    "பூஜ்ஜியம்", "ஒன்று", "இரண்டு", "மூன்று", "நான்கு", "ஐந்து", "ஆறு", "ஏழு", "எட்டு", "ஒன்பது",
    "பத்து", "பதினொன்று", "பன்னிரண்டு", "பதிமூன்று", "பதினான்கு", "பதினைந்து", "பதினாறு", "பதினேழு", "பதினெட்டு", "பத்தொன்பது",
  ],
  tens: ["", "", "இருபது", "முப்பது", "நாற்பது", "ஐம்பது", "அறுபது", "எழுபது", "எண்பது", "தொண்ணூறு"],
  // Tamil tens take a combining form before a unit: 21 = இருபத்தி ஒன்று.
  tensJoin: ["", "", "இருபத்தி", "முப்பத்தி", "நாற்பத்தி", "ஐம்பத்தி", "அறுபத்தி", "எழுபத்தி", "எண்பத்தி", "தொண்ணூற்றி"],
  point: "புள்ளி",
};

// Hindi 0–99 is irregular; full table.
const HI_WORDS = [
  "शून्य", "एक", "दो", "तीन", "चार", "पाँच", "छह", "सात", "आठ", "नौ",
  "दस", "ग्यारह", "बारह", "तेरह", "चौदह", "पंद्रह", "सोलह", "सत्रह", "अठारह", "उन्नीस",
  "बीस", "इक्कीस", "बाईस", "तेईस", "चौबीस", "पच्चीस", "छब्बीस", "सत्ताईस", "अट्ठाईस", "उनतीस",
  "तीस", "इकतीस", "बत्तीस", "तैंतीस", "चौंतीस", "पैंतीस", "छत्तीस", "सैंतीस", "अड़तीस", "उनतालीस",
  "चालीस", "इकतालीस", "बयालीस", "तैंतालीस", "चौवालीस", "पैंतालीस", "छियालीस", "सैंतालीस", "अड़तालीस", "उनचास",
  "पचास", "इक्यावन", "बावन", "तिरपन", "चौवन", "पचपन", "छप्पन", "सत्तावन", "अट्ठावन", "उनसठ",
  "साठ", "इकसठ", "बासठ", "तिरसठ", "चौंसठ", "पैंसठ", "छियासठ", "सड़सठ", "अड़सठ", "उनहत्तर",
  "सत्तर", "इकहत्तर", "बहत्तर", "तिहत्तर", "चौहत्तर", "पचहत्तर", "छिहत्तर", "सतहत्तर", "अठहत्तर", "उनासी",
  "अस्सी", "इक्यासी", "बयासी", "तिरासी", "चौरासी", "पचासी", "छियासी", "सतासी", "अठासी", "नवासी",
  "नब्बे", "इक्यानवे", "बानवे", "तिरानवे", "चौरानवे", "पचानवे", "छियानवे", "सत्तानवे", "अट्ठानवे", "निन्यानवे",
];
const HI_POINT = "दशमलव";

const TABLES: Record<string, Table> = { en: EN, te: TE, ta: TA };

function digitWords(d: number, lang: string): string {
  return lang === "hi" ? HI_WORDS[d] : (TABLES[lang] ?? EN).ones[d];
}

function under100(n: number, lang: string): string {
  if (lang === "hi") return HI_WORDS[n];
  const tb = TABLES[lang] ?? EN;
  if (n < 20) return tb.ones[n];
  const t = Math.floor(n / 10);
  const u = n % 10;
  if (u === 0) return tb.tens[t];
  const tensWord = tb.tensJoin ? tb.tensJoin[t] : tb.tens[t];
  return lang === "en" ? `${tensWord}-${tb.ones[u]}` : `${tensWord} ${tb.ones[u]}`;
}

/** Whole part: 0–99 as words; 100+ read digit by digit (rare for waves/wind). */
function wholeWords(n: number, lang: string): string {
  if (n < 100) return under100(n, lang);
  return String(n).split("").map((c) => digitWords(Number(c), lang)).join(" ");
}

export function numberToWords(n: number, lang: string): string {
  const code = lang === "hi" || lang in TABLES ? lang : "en";
  if (!Number.isFinite(n)) return "";
  const neg = n < 0;
  const abs = Math.abs(n);
  // Cap at one decimal: "2.34" is noise when spoken.
  const [whole, frac] = abs.toFixed(1).split(".");
  const point = code === "hi" ? HI_POINT : (TABLES[code] ?? EN).point;
  let out = wholeWords(Number(whole), code);
  if (frac && frac !== "0") {
    out += ` ${point} ` + frac.split("").map((c) => digitWords(Number(c), code)).join(" ");
  }
  return neg ? `${code === "en" ? "minus" : "-"} ${out}` : out;
}

/** Plain runtime self-check; call from node. Throws on the first mismatch. */
export function selfCheckNumberWords(): void {
  const cases: Array<[number, string, string]> = [
    [0, "en", "zero"],
    [22, "en", "twenty-two"],
    [2.3, "en", "two point three"],
    [99, "en", "ninety-nine"],
    [120, "en", "one two zero"],
    [22, "hi", "बाईस"],
    [2.3, "hi", "दो दशमलव तीन"],
    [21, "te", "ఇరవై ఒకటి"],
    [1.5, "te", "ఒకటి పాయింట్ ఐదు"],
    [21, "ta", "இருபத்தி ஒன்று"],
    [40, "ta", "நாற்பது"],
    [3.7, "ta", "மூன்று புள்ளி ஏழு"],
    [22, "ml", "twenty-two"],
    [2.35, "en", "two point four"],
  ];
  for (const [n, lang, want] of cases) {
    const got = numberToWords(n, lang);
    if (got !== want) throw new Error(`numberToWords(${n}, ${lang}) = "${got}", want "${want}"`);
  }
  console.log(`[ORCA numberWords] ${cases.length} checks ok`);
}
