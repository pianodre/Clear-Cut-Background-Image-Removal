import Logo from "./Logo.jsx";

export default function Footer() {
  return (
    <footer className="border-t border-ink-800 bg-ink-950">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-10 sm:flex-row lg:px-10">
        <Logo />
        <p className="text-[0.7rem] uppercase tracking-widest text-ink-400">
          © {new Date().getFullYear()} ClearCut
        </p>
        <p className="text-[0.7rem] uppercase tracking-widest text-ink-500">
          Powered by the Photoroom API
        </p>
      </div>
    </footer>
  );
}
