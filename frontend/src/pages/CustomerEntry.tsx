import { Link } from "react-router-dom";

export default function CustomerEntry() {
  return (
    <main className="relative isolate flex min-h-screen items-center justify-center overflow-x-hidden bg-canteen-home px-4 py-8 text-white sm:px-8 lg:py-16">
      {/* Ambient background glow & radial gradient */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_0%,rgba(245,158,11,0.25),transparent_65%),radial-gradient(ellipse_at_80%_80%,rgba(16,185,129,0.2),transparent_60%)]"
      />

<<<<<<< HEAD
      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
        <div className="relative z-10">
          <header className="mb-9">
            <div className="entry-from-left entry-delay-1 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/30 bg-white text-xl font-black text-violet-700 shadow-lg shadow-indigo-950/20">
                K
              </div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-white">
                Kiosk Manager
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
=======
      <div className="mx-auto w-full max-w-6xl">
        {/* Brand & Kiosk Welcome Header - High Visibility from 10ft */}
        <header className="mb-10 text-center">
          <div className="inline-flex items-center gap-3 rounded-full border border-amber-400/40 bg-slate-900/80 px-5 py-2.5 shadow-2xl backdrop-blur-md">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 text-lg font-black text-slate-950 shadow-md">
              Q
            </span>
            <span className="text-sm font-extrabold uppercase tracking-[0.25em] text-amber-300">
              RV College of Engineering Canteen • Touch Kiosk
            </span>
          </div>
>>>>>>> 89d3e54 (Save my local changes)

          <h1 className="kiosk-title-shadow mt-6 text-4xl font-black tracking-tight text-white sm:text-6xl lg:text-7xl">
            Welcome to <span className="bg-gradient-to-r from-amber-400 via-orange-300 to-yellow-400 bg-clip-text text-transparent">RVCE Canteen</span>
          </h1>
          <p className="kiosk-text-shadow mx-auto mt-4 max-w-2xl text-xl font-medium text-slate-200 sm:text-2xl">
            Vote for tomorrow's special dishes, order your favorites, and track counter tokens live.
          </p>
        </header>

        {/* 10-Foot Distance Optimized Action Cards - Featuring Tomorrow's Menu Voting as Primary */}
        <section aria-label="Kiosk customer options" className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2">
          {/* FLAGSHIP HERO 1: Tomorrow's Menu Voting (Like / Dislike) */}
          <Link
            to="/menu-voting"
            aria-label="Vote Like or Dislike for Tomorrow's Menu"
            className="group relative flex min-h-80 cursor-pointer flex-col justify-between overflow-hidden rounded-3xl border-2 border-emerald-400/80 bg-gradient-to-b from-slate-900/90 via-slate-900/95 to-emerald-950/40 p-8 shadow-[0_20px_50px_rgba(0,0,0,0.7)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-2 hover:border-emerald-400 hover:shadow-[0_25px_60px_rgba(16,185,129,0.35)] focus-visible:outline focus-visible:outline-4 focus-visible:outline-emerald-400"
          >
            <div className="absolute -right-8 -top-8 h-44 w-44 rounded-full bg-emerald-500/15 blur-3xl transition-all group-hover:bg-emerald-500/30" />

            <div className="flex items-center justify-between">
              <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-3xl font-black text-slate-950 shadow-lg shadow-emerald-500/30">
                🗳️
              </span>
              <span className="rounded-full border border-emerald-400/50 bg-emerald-400/20 px-4 py-1.5 text-xs font-black uppercase tracking-wider text-emerald-300 animate-pulse">
                ★ Core Kiosk Theme
              </span>
            </div>

            <div className="mt-8">
              <div className="flex items-center gap-2">
                <span className="text-2xl">👍</span>
                <span className="text-2xl">👎</span>
                <h2 className="text-3xl font-black text-white sm:text-4xl">
                  Tomorrow's Menu Poll
                </h2>
              </div>
              <p className="mt-2 text-lg font-medium text-slate-300">
                Vote <strong className="text-emerald-400">Like 👍</strong> or <strong className="text-rose-400">Dislike 👎</strong> on candidate dishes. The canteen prepares what students vote for!
              </p>
              <div className="mt-6 flex items-center gap-3 text-lg font-bold text-emerald-400 transition-all group-hover:translate-x-2">
                <span>Cast Your Vote for Tomorrow</span>
                <span className="text-2xl">→</span>
              </div>
            </div>
          </Link>

          {/* FLAGSHIP HERO 2: Order Food Now */}
          <Link
            to="/order"
            aria-label="Start ordering food"
            className="group relative flex min-h-80 cursor-pointer flex-col justify-between overflow-hidden rounded-3xl border-2 border-amber-400/80 bg-gradient-to-b from-slate-900/90 via-slate-900/95 to-amber-950/40 p-8 shadow-[0_20px_50px_rgba(0,0,0,0.7)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-2 hover:border-amber-400 hover:shadow-[0_25px_60px_rgba(245,158,11,0.35)] focus-visible:outline focus-visible:outline-4 focus-visible:outline-amber-400"
          >
            <div className="absolute -right-8 -top-8 h-44 w-44 rounded-full bg-amber-500/15 blur-3xl transition-all group-hover:bg-amber-500/30" />

<<<<<<< HEAD
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
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-violet-700 text-lg font-black text-white shadow-md shadow-violet-700/25">K</div>
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
=======
            <div className="flex items-center justify-between">
              <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-3xl font-black text-slate-950 shadow-lg shadow-amber-500/30">
                🍽️
              </span>
              <span className="rounded-full border border-amber-400/40 bg-amber-400/20 px-4 py-1.5 text-xs font-black uppercase tracking-wider text-amber-300">
                Today's Menu
              </span>
            </div>

            <div className="mt-8">
              <h2 className="text-3xl font-black text-white sm:text-4xl">
                Order Food Now
              </h2>
              <p className="mt-2 text-lg font-medium text-slate-300">
                Touch to browse today's menu, use voice search 🎤, and checkout with UPI QR.
              </p>
              <div className="mt-6 flex items-center gap-3 text-lg font-bold text-amber-400 transition-all group-hover:translate-x-2">
                <span>Explore Menu & Order</span>
                <span className="text-2xl">→</span>
>>>>>>> 89d3e54 (Save my local changes)
              </div>
            </div>
          </Link>

          {/* SECONDARY CARD 1: Live Order Token Display */}
          <Link
            to="/live-display"
            aria-label="View live order tokens status"
            className="group relative flex min-h-64 cursor-pointer flex-col justify-between rounded-3xl border border-white/20 bg-slate-900/85 p-8 shadow-xl backdrop-blur-xl transition-all duration-300 hover:-translate-y-2 hover:border-sky-400/70 hover:shadow-[0_20px_50px_rgba(56,189,248,0.25)] focus-visible:outline focus-visible:outline-4 focus-visible:outline-sky-400"
          >
            <div className="flex items-center justify-between">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-500/20 text-2xl font-bold text-sky-400 border border-sky-500/30">
                📟
              </span>
              <span className="flex h-3 w-3 rounded-full bg-sky-400 shadow-[0_0_12px_#38bdf8] animate-pulse" />
            </div>

            <div className="mt-6">
              <h2 className="text-2xl font-black text-white">
                Live Token Display
              </h2>
              <p className="mt-2 text-base text-slate-300">
                Check whether your counter token is preparing or ready for pickup.
              </p>
              <div className="mt-4 flex items-center gap-2 text-base font-bold text-sky-400 transition group-hover:translate-x-1">
                <span>View Status</span>
                <span>→</span>
              </div>
            </div>
          </Link>

          {/* SECONDARY CARD 2: Rate Your Food & Feedback */}
          <Link
            to="/food-ratings"
            aria-label="Rate your food and leave feedback"
            className="group relative flex min-h-64 cursor-pointer flex-col justify-between rounded-3xl border border-white/20 bg-slate-900/85 p-8 shadow-xl backdrop-blur-xl transition-all duration-300 hover:-translate-y-2 hover:border-yellow-400/70 hover:shadow-[0_20px_50px_rgba(250,204,21,0.25)] focus-visible:outline focus-visible:outline-4 focus-visible:outline-yellow-400"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-yellow-500/20 text-2xl font-bold text-yellow-400 border border-yellow-500/30">
              ⭐
            </span>

            <div className="mt-6">
              <h2 className="text-2xl font-black text-white">
                Rate Food & Feedback
              </h2>
              <p className="mt-2 text-base text-slate-300">
                Already collected your order? Share your rating and tell us how the food tasted!
              </p>
              <div className="mt-4 flex items-center gap-2 text-base font-bold text-yellow-400 transition group-hover:translate-x-1">
                <span>Leave Feedback</span>
                <span>→</span>
              </div>
            </div>
          </Link>
        </section>

        {/* Footer: Admin Management Link */}
        <footer className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-slate-950/60 px-6 py-4 backdrop-blur-md">
          <p className="text-sm font-semibold text-slate-300">
            RV College of Engineering Canteen Automation • Mysore Road, Bengaluru
          </p>

          <div className="flex items-center gap-3 text-sm">
            <span className="text-slate-400">Staff / Counter Management:</span>
            <Link
              to="/admin/login"
              className="rounded-xl border border-amber-400/40 bg-slate-800/90 px-4 py-2 font-bold text-amber-400 shadow transition hover:bg-slate-700 hover:text-amber-300"
            >
              Admin Sign In →
            </Link>
          </div>
        </footer>
      </div>
    </main>
  );
}
