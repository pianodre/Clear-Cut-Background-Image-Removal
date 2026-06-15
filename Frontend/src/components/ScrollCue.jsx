/** Vertical "SCROLL" cue on the right edge of the hero. */
export default function ScrollCue() {
  return (
    <div className="absolute bottom-10 right-6 z-20 hidden flex-col items-center gap-3 lg:flex lg:right-10">
      <span className="text-[0.7rem] uppercase tracking-widest text-ink-400 [writing-mode:vertical-rl]">
        Scroll
      </span>
      <span className="h-16 w-px bg-gradient-to-b from-ink-400 to-transparent" />
    </div>
  );
}
