/** Vertical stack of social icons, fixed bottom-left of the hero — like the references. */
const LINKS = [
  {
    label: "Instagram",
    href: "#",
    path: "M12 8.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7zM17.5 6.5h.01M4 8a4 4 0 014-4h8a4 4 0 014 4v8a4 4 0 01-4 4H8a4 4 0 01-4-4V8z",
  },
  {
    label: "Facebook",
    href: "#",
    path: "M14 8h2V5h-2a3 3 0 00-3 3v2H9v3h2v6h3v-6h2.2l.8-3H14V8.5c0-.4.3-.5.6-.5z",
  },
  {
    label: "X",
    href: "#",
    path: "M4 4l16 16M20 4L4 20",
  },
];

export default function SocialRail() {
  return (
    <div className="absolute bottom-10 left-6 z-20 hidden flex-col items-center gap-5 lg:flex lg:left-10">
      {LINKS.map((l) => (
        <a
          key={l.label}
          href={l.href}
          aria-label={l.label}
          className="text-ink-400 transition hover:text-white"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d={l.path} />
          </svg>
        </a>
      ))}
      <span className="mt-2 h-14 w-px bg-gradient-to-b from-ink-500 to-transparent" />
    </div>
  );
}
