import { MapPin } from 'lucide-react';

const markets = [
  {
    name: 'Ladipo Market, Mushin',
    description:
      'The largest auto parts market in West Africa. Our runners know every stall.',
  },
  {
    name: 'ASPAMDA, Trade Fair',
    description:
      'International trade complex for imported parts. Direct from importers to you.',
  },
];

export function ServiceAreaSection() {
  return (
    <section className="bg-white px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-center text-2xl font-bold text-slate-900 sm:text-3xl">
          Serving Lagos Markets
        </h2>

        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {markets.map(({ name, description }) => (
            <div
              key={name}
              className="flex gap-4 rounded-card border border-slate-200 bg-slate-50 p-6"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900">{name}</h3>
                <p className="mt-1 text-sm text-slate-500">{description}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          Express delivery covers a 10km radius. Standard delivery covers the rest of Lagos.
        </p>
      </div>
    </section>
  );
}
