"use client";

/**
 * The spoken reply as text, sentence by sentence, with the sentence being
 * spoken highlighted and the word within it underlined where the engine
 * reports boundaries. Digits are shown in the reader's numerals; the engine
 * is given Latin digits.
 */
import { useFmt } from "@/lib/i18n";
import type { SpokenScript } from "@/lib/spoken/buildSpokenScript";

export function Transcript({ script, activeSentence, activeWord, large = false }: { script: SpokenScript; activeSentence: number; activeWord: { sentence: number; start: number; end: number } | null; large?: boolean }) {
  const f = useFmt();
  return (
    <p className={`${large ? "text-2xl leading-relaxed" : "text-base leading-relaxed"}`} lang={script.lang}>
      {script.sentences.map((s, i) => {
        const active = i === activeSentence;
        const w = active && activeWord && activeWord.sentence === i ? activeWord : null;
        return (
          <span key={i} className="spoken-sentence" data-active={active} data-key={s.key}>
            {w ? (
              <>
                {f.raw(s.text.slice(0, w.start))}
                <span className="spoken-word" data-active="true">{f.raw(s.text.slice(w.start, w.end))}</span>
                {f.raw(s.text.slice(w.end))}
              </>
            ) : (
              f.raw(s.text)
            )}{" "}
          </span>
        );
      })}
    </p>
  );
}
