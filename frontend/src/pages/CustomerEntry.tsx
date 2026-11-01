import { Link } from "react-router-dom";

export default function CustomerEntry() {
  return (
    <main className="relative isolate flex min-h-screen items-center overflow-hidden bg-gradient-to-br from-indigo-700 to-violet-600 px-4 py-8 text-white sm:px-6 lg:py-12">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-20 bg-[radial-gradient(ellipse_at_82%_42%,rgba(255,255,255,0.22),transparent_35%),radial-gradient(ellipse_at_0%_100%,rgba(49,46,129,0.38),transparent_48%)]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-y-0 right-[13%] -z-10 hidden w-[20%] border-x border-white/10 opacity-50 [background-image:repeating-linear-gradient(90deg,transparent_0,transparent_15px,rgba(255,255,255,0.12)_16px,transparent_20px)] lg:block"
      />
      <div
        aria-hidden="true"
        className="absolute -right-32 top-1/4 -z-10 hidden h-[34rem] w-[34rem] rounded-full bg-fuchsia-400/20 blur-3xl lg:block"
      />

      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
        <div className="relative z-10">
          <header className="mb-9">
            <div className="entry-from-left entry-delay-1 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/30 bg-white text-xl font-black text-violet-700 shadow-lg shadow-indigo-950/20">
                Q
              </div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-white">
                Qiosk Manager
              </p>
            </div>
            <p className="entry-from-left entry-delay-2 mt-12 text-xs font-bold uppercase tracking-[0.25em] text-violet-100">
              Good food. Good mood.
            </p>
            <h1 className="mt-4 max-w-xl text-4xl font-black leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
              <span className="word-from-left word-delay-1">Your</span>{" "}
              <span className="word-from-left word-delay-2">next</span>{" "}
              <span className="word-from-left word-delay-3">favorite</span>{" "}
              <span className="word-from-left word-delay-4">bite</span>
              <span className="block text-violet-100">
                <span className="word-from-right word-delay-5">starts</span>{" "}
                <span className="word-from-right word-delay-6">here.</span>
              </span>
            </h1>
            <p className="entry-from-left entry-delay-4 mt-5 max-w-lg text-base leading-7 text-indigo-100 sm:text-lg">
              Take a look at the menu, place your order, and leave us a little
              feedback when you’re done.
            </p>
          </header>

          <section aria-label="Customer options" className="grid gap-4 sm:grid-cols-2">
          <Link
            to="/order"
            aria-label="Open the customer ordering page"
            className="entry-from-left entry-delay-5 group flex min-h-52 cursor-pointer flex-col justify-between rounded-2xl border border-white/60 bg-white p-6 text-slate-950 shadow-[0_20px_60px_-24px_rgba(30,27,75,0.65)] transition duration-300 hover:-translate-y-2 hover:scale-[1.02] hover:shadow-[0_28px_70px_-24px_rgba(30,27,75,0.8)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white sm:p-7"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-700 text-2xl font-bold text-white">
              +
            </span>
            <span>
              <span className="block text-xl font-bold">Order Food</span>
              <span className="mt-2 block text-sm leading-6 text-slate-700">
                Browse the menu and start your order.
              </span>
              <span className="mt-4 inline-block text-sm font-bold text-violet-700 transition group-hover:translate-x-1 group-hover:underline">
                Explore the menu →
              </span>
            </span>
          </Link>

          <Link
            to="/food-ratings"
            className="entry-from-right entry-delay-6 group flex min-h-52 cursor-pointer flex-col justify-between rounded-2xl border border-white/30 bg-white/10 p-6 text-white shadow-lg shadow-indigo-950/20 backdrop-blur-md transition duration-300 hover:-translate-y-2 hover:scale-[1.02] hover:bg-white/20 hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white sm:p-7"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 text-2xl font-bold text-white">
              ★
            </span>
            <span>
              <span className="block text-xl font-bold">Rate Your Food</span>
              <span className="mt-2 block text-sm leading-6 text-indigo-100">
                Already ordered? Tell us what you thought.
              </span>
              <span className="mt-4 inline-block text-sm font-bold text-white transition group-hover:translate-x-1 group-hover:underline">
                Share your feedback →
              </span>
            </span>
          </Link>

          <Link
            to="/menu-voting"
            className="entry-from-left entry-delay-7 group flex min-h-52 cursor-pointer flex-col justify-between rounded-2xl border border-white/30 bg-white/10 p-6 text-white shadow-lg shadow-indigo-950/20 backdrop-blur-md transition duration-300 hover:-translate-y-2 hover:scale-[1.02] hover:bg-white/20 hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white sm:p-7"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 text-2xl font-bold text-white">
              ☑
            </span>
            <span>
              <span className="block text-xl font-bold">Menu Voting</span>
              <span className="mt-2 block text-sm leading-6 text-indigo-100">
                Help choose what goes on tomorrow’s menu.
              </span>
              <span className="mt-4 inline-block text-sm font-bold text-white transition group-hover:translate-x-1 group-hover:underline">
                Cast your vote →
              </span>
            </span>
          </Link>
          </section>

          <footer className="mt-7">
          <Link
            to="/admin/login"
            className="entry-from-left entry-delay-7 inline-block text-sm font-medium text-indigo-100 underline-offset-4 transition hover:translate-x-1 hover:text-white hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
          >
            Admin sign in
          </Link>
          </footer>
        </div>

        <div aria-hidden="true" className="entry-from-right entry-delay-4 relative mx-auto hidden h-[32rem] w-full max-w-md [perspective:1100px] md:block">
          <div className="absolute bottom-8 left-0 right-0 h-24 rounded-[50%] bg-indigo-950/35 blur-2xl" />
          <div className="kiosk-float absolute bottom-16 left-1/2 h-[27rem] w-64 -translate-x-1/2 [transform:rotateY(-12deg)_rotateX(2deg)] [transform-style:preserve-3d]">
            <div className="absolute -right-4 inset-y-5 w-5 rounded-r-xl border-y border-r border-violet-300 bg-gradient-to-r from-indigo-500 via-violet-700 to-indigo-950 shadow-[12px_8px_18px_rgba(30,27,75,0.4)]" />
            <div className="relative h-full rounded-[2.25rem] border border-white/80 bg-gradient-to-br from-white via-violet-50 to-violet-200 p-3 shadow-[0_35px_80px_-25px_rgba(30,27,75,0.75)]">
            <div className="relative h-full overflow-hidden rounded-[1.7rem] border-[7px] border-indigo-950 bg-gradient-to-br from-white via-violet-50 to-indigo-100 shadow-[inset_0_0_24px_rgba(79,70,229,0.16)]">
              <div className="absolute inset-x-0 top-0 h-8 bg-indigo-950">
                <span className="absolute left-1/2 top-2 h-1 w-12 -translate-x-1/2 rounded-full bg-white/40" />
              </div>
              <div className="px-5 pb-5 pt-14">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-violet-700 text-lg font-black text-white shadow-md shadow-violet-700/25">Q</div>
                <p className="mt-3 text-center text-[10px] font-bold uppercase tracking-[0.18em] text-violet-800">Welcome</p>
                <div className="mt-4 h-24 rounded-xl bg-gradient-to-br from-indigo-700 to-violet-600 p-3 shadow-lg shadow-violet-900/25">
                  <div className="h-full w-2/3 rounded-lg border border-white/40 bg-white/15" />
                </div>
                <div className="mt-4 space-y-2">
                  <div className="h-9 rounded-lg bg-white/80 shadow-sm" />
                  <div className="h-9 rounded-lg border border-violet-100 bg-white shadow-sm" />
                  <div className="h-9 rounded-lg bg-violet-700 shadow-md shadow-violet-700/25" />
                </div>
                <div className="mx-auto mt-5 h-2 w-14 rounded-full bg-violet-200" />
              </div>
            </div>
            </div>
          </div>
          <div className="absolute bottom-10 left-1/2 h-12 w-40 -translate-x-1/2 [transform:rotateX(-8deg)] rounded-b-2xl border-x border-b border-white/80 bg-gradient-to-r from-indigo-700 via-violet-400 to-violet-800 shadow-[0_16px_25px_rgba(49,46,129,0.55)]" />
          <div className="absolute bottom-4 left-1/2 h-8 w-64 -translate-x-1/2 [transform:rotateX(12deg)] rounded-[50%] border-t border-white/70 bg-gradient-to-b from-violet-300 via-violet-700 to-indigo-950 shadow-2xl" />
          <div className="absolute right-0 top-16 rounded-full border border-white/30 bg-white/90 px-4 py-2 text-xs font-semibold tracking-wide text-violet-800 shadow-lg shadow-indigo-950/20 backdrop-blur">
            Freshly made. Just for you.
          </div>
        </div>
      </div>
    </main>
  );
}
