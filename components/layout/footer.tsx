import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {/* Brand */}
          <div>
            <p className="text-lg font-bold text-white">PartsDey</p>
            <p className="mt-2 text-sm">
              We run am for you. Spare parts delivered in 45 minutes across Lagos.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
              Quick Links
            </p>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#how-it-works" className="transition-colors hover:text-white">
                  How It Works
                </a>
              </li>
              <li>
                <a href="#faq" className="transition-colors hover:text-white">
                  FAQ
                </a>
              </li>
              <li>
                <Link href="/login" className="transition-colors hover:text-white">
                  Login
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
              Contact
            </p>
            <ul className="space-y-2 text-sm">
              <li>WhatsApp: +234 XXX XXX XXXX</li>
              <li>Email: hello@partsdey.ng</li>
              <li>Lagos, Nigeria</li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-slate-800 pt-6 text-center text-xs text-slate-500">
          &copy; {new Date().getFullYear()} PartsDey. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
