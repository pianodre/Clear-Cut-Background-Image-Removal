import { useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import Footer from "../components/Footer.jsx";
import SocialRail from "../components/SocialRail.jsx";
import ScrollCue from "../components/ScrollCue.jsx";
import Reveal from "../components/Reveal.jsx";

const FEATURES = [
  {
    title: "Built for batches",
    body: "Drop a whole shoot in at once. ClearCut cuts out every subject in parallel — no one-at-a-time clicking.",
    icon: "M3 7h18M3 12h18M3 17h18",
  },
  {
    title: "Studio-grade edges",
    body: "Powered by the Photoroom API: clean hair, fur, and fine detail that hold up at print resolution.",
    icon: "M5 13l4 4L19 7",
  },
  {
    title: "Keep your resolution",
    body: "Export full-res PNGs with transparency, ready to drop onto any background or hand to a client.",
    icon: "M4 16l4.5-6 3.5 4.5 2.5-3L20 16M4 20h16",
  },
];

// Pricing shows BOTH a subscription and pay-per-image, because the model isn't
// decided yet — useful to show Chris and react to.
const PLANS = [
  {
    name: "Pay as you go",
    price: "$0.20",
    unit: "/ image",
    blurb: "No commitment. Top up credits whenever you have a shoot to run.",
    features: ["No monthly fee", "Buy credits in any amount", "Full-resolution PNGs", "Credits never expire"],
    cta: "Get started",
    highlighted: false,
  },
  {
    name: "Studio",
    price: "$29",
    unit: "/ month",
    blurb: "For working photographers running shoots every week.",
    features: ["500 images / month", "Then $0.10 per extra", "Priority processing", "Bulk download as .zip"],
    cta: "Subscribe",
    highlighted: true,
  },
  {
    name: "Volume",
    price: "Let's talk",
    unit: "",
    blurb: "High-volume studios and teams. Custom limits and pricing.",
    features: ["Unlimited seats", "Custom monthly volume", "API access", "Dedicated support"],
    cta: "Contact us",
    highlighted: false,
  },
];

function Hero() {
  return (
    <section className="relative overflow-hidden bg-stage">
      <div className="mx-auto flex min-h-[88vh] max-w-7xl flex-col items-center justify-center px-6 text-center">
        <Reveal as="p" className="text-[0.7rem] font-medium uppercase tracking-[0.45em] text-ink-400">
          Background Remover
        </Reveal>
        <Reveal as="h1" delay={120} className="text-hero mt-6 text-6xl font-black uppercase leading-none tracking-tight text-white sm:text-8xl lg:text-[9.5rem]">
          ClearCut
        </Reveal>
        <Reveal as="p" delay={240} className="mt-7 max-w-md text-xs uppercase tracking-[0.3em] text-ink-300 sm:text-sm">
          Studio-grade cutouts, in bulk
        </Reveal>
        <Reveal delay={360} className="mt-12 flex flex-wrap items-center justify-center gap-4">
          <Link to="/signup" className="btn-primary px-7 py-3.5">
            Get started
          </Link>
          <Link to="/app" className="btn-ghost px-7 py-3.5">
            Try the tool
          </Link>
        </Reveal>
      </div>
      <SocialRail />
      <ScrollCue />
    </section>
  );
}

function Features() {
  return (
    <section id="features" className="border-t border-ink-800 bg-ink-950 py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <Reveal as="header" className="max-w-2xl">
          <p className="text-[0.7rem] uppercase tracking-widest text-ink-400">What you get</p>
          <h2 className="mt-3 text-3xl font-extrabold uppercase tracking-tight text-white sm:text-4xl">
            Built for the shoot, not the single shot
          </h2>
        </Reveal>
        <Reveal className="mt-14 grid gap-px overflow-hidden rounded-xl border border-ink-800 bg-ink-800 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-ink-900 p-8 transition-colors duration-300 hover:bg-ink-850">
              <span className="grid h-11 w-11 place-items-center rounded-lg border border-ink-700 text-white">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d={f.icon} />
                </svg>
              </span>
              <h3 className="mt-6 text-sm font-semibold uppercase tracking-wide text-white">
                {f.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-ink-300">{f.body}</p>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}

function BeforeAfter() {
  return (
    <div className="mx-auto grid max-w-3xl grid-cols-2 overflow-hidden rounded-xl border border-ink-700 shadow-panel">
      <div className="relative bg-gradient-to-br from-ink-600 to-ink-800 p-6">
        <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-widest text-white">
          Before
        </span>
        <div className="flex h-56 items-end justify-center">
          <div className="h-36 w-28 rounded-t-[3rem] bg-ink-950" />
        </div>
      </div>
      <div className="checkerboard relative p-6">
        <span className="absolute left-3 top-3 rounded-full bg-white px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-widest text-ink-950">
          After
        </span>
        <div className="flex h-56 items-end justify-center">
          <div className="h-36 w-28 rounded-t-[3rem] bg-ink-950 shadow-lg" />
        </div>
      </div>
    </div>
  );
}

function Showcase() {
  return (
    <section className="bg-stage py-24">
      <div className="mx-auto max-w-7xl px-6 text-center lg:px-10">
        <Reveal>
          <BeforeAfter />
        </Reveal>
        <Reveal as="h2" delay={120} className="text-hero mt-14 text-4xl font-black uppercase tracking-tight text-white sm:text-6xl">
          See the cut
        </Reveal>
        <Reveal as="p" delay={200} className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-ink-300">
          Upload an image, get a clean transparent PNG back in seconds. No masking,
          no Photoshop, no per-image busywork.
        </Reveal>
        <Reveal delay={280} className="mt-9">
          <Link to="/app" className="btn-ghost px-7 py-3.5">
            View the tool
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

function Pricing() {
  return (
    <section id="pricing" className="border-t border-ink-800 bg-ink-950 py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <Reveal as="header" className="mx-auto max-w-2xl text-center">
          <p className="text-[0.7rem] uppercase tracking-widest text-ink-400">Pricing</p>
          <h2 className="mt-3 text-3xl font-extrabold uppercase tracking-tight text-white sm:text-4xl">
            Pay per image, or subscribe
          </h2>
          <p className="mt-4 text-sm text-ink-300">Cancel anytime. No surprises.</p>
        </Reveal>
        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {PLANS.map((plan, i) => (
            <Reveal key={plan.name} delay={i * 120}>
              <div
                className={`card relative h-full p-8 transition duration-300 hover:-translate-y-1.5 ${
                  plan.highlighted ? "border-white" : "hover:border-ink-500"
                }`}
              >
                {plan.highlighted && (
                  <span className="absolute -top-3 left-8 rounded-full bg-white px-3 py-1 text-[0.6rem] font-semibold uppercase tracking-widest text-ink-950">
                    Most popular
                  </span>
                )}
                <h3 className="text-sm font-semibold uppercase tracking-widest text-ink-300">
                  {plan.name}
                </h3>
                <p className="mt-4">
                  <span className="text-4xl font-black text-white">{plan.price}</span>
                  <span className="ml-1 text-sm text-ink-400">{plan.unit}</span>
                </p>
                <p className="mt-3 text-sm text-ink-300">{plan.blurb}</p>
                <ul className="mt-6 space-y-3 text-sm text-ink-200">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2.5">
                      <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                      {feat}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/signup"
                  className={`mt-8 w-full ${plan.highlighted ? "btn-primary" : "btn-ghost"}`}
                >
                  {plan.cta}
                </Link>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Contact() {
  const [sent, setSent] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    setSent(true);
  }

  return (
    <section id="contact" className="bg-stage py-24">
      <div className="mx-auto grid max-w-7xl gap-14 px-6 lg:grid-cols-2 lg:px-10">
        <Reveal>
          <h2 className="text-hero text-4xl font-black uppercase tracking-tight text-white sm:text-5xl">
            Get in touch
          </h2>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-ink-300">
            Questions about volume pricing, the API, or whether ClearCut fits your
            workflow? Send a note and we'll get back to you.
          </p>
          <dl className="mt-10 space-y-6">
            <div>
              <dt className="text-[0.7rem] font-semibold uppercase tracking-widest text-ink-400">Email</dt>
              <dd className="mt-1 text-sm text-ink-100">hello@clearcut.app</dd>
            </div>
            <div>
              <dt className="text-[0.7rem] font-semibold uppercase tracking-widest text-ink-400">Based in</dt>
              <dd className="mt-1 text-sm text-ink-100">Orange County, CA</dd>
            </div>
          </dl>
        </Reveal>

        <Reveal delay={150} className="card p-8 sm:p-10">
          <h3 className="text-2xl font-extrabold uppercase tracking-wide text-white">
            Contact form
          </h3>
          {sent ? (
            <p className="mt-8 text-sm text-ink-200">
              Thanks — we'll be in touch shortly.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 space-y-6">
              <div>
                <label className="label" htmlFor="c-name">Your name</label>
                <input id="c-name" className="input" type="text" placeholder="Jane Photographer" />
              </div>
              <div>
                <label className="label" htmlFor="c-email">Your e-mail</label>
                <input id="c-email" className="input" type="email" placeholder="you@studio.com" />
              </div>
              <div>
                <label className="label" htmlFor="c-msg">Message</label>
                <input id="c-msg" className="input" type="text" placeholder="What can we help with?" />
              </div>
              <button type="submit" className="btn-primary w-full">
                Send message →
              </button>
            </form>
          )}
        </Reveal>
      </div>
    </section>
  );
}

export default function Landing() {
  return (
    <div className="bg-ink-950">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <Showcase />
        <Pricing />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}
