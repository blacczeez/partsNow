import Link from 'next/link';

export function CtaSection() {
  return (
    <section className="bg-gradient-to-br from-primary to-primary-dark px-4 py-16 text-white sm:px-6 sm:py-20">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-2xl font-bold sm:text-3xl">
          Ready to Skip the Market Run?
        </h2>
        <p className="mt-3 text-base text-blue-100">
          Join hundreds of mechanics and car owners who get their parts delivered.
        </p>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <a
            href="https://wa.me/234XXXXXXXXXX"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full items-center justify-center rounded-button bg-secondary px-6 py-3 text-base font-medium text-white transition-colors hover:bg-secondary-dark sm:w-auto"
          >
            Order via WhatsApp
          </a>
          <Link
            href="/login"
            className="inline-flex w-full items-center justify-center rounded-button border-2 border-white px-6 py-3 text-base font-medium text-white transition-colors hover:bg-white/10 sm:w-auto"
          >
            Get Started
          </Link>
        </div>
      </div>
    </section>
  );
}
