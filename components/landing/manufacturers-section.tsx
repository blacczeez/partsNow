const manufacturers = [
  { name: 'Toyota', initial: 'T', color: '#EB0A1E' },
  { name: 'Honda', initial: 'H', color: '#CC0000' },
  { name: 'Mercedes-Benz', initial: 'MB', color: '#333333' },
  { name: 'BMW', initial: 'B', color: '#0066B1' },
  { name: 'Nissan', initial: 'N', color: '#C3002F' },
  { name: 'Hyundai', initial: 'H', color: '#002C5F' },
  { name: 'Kia', initial: 'K', color: '#05141F' },
  { name: 'Volkswagen', initial: 'VW', color: '#001E50' },
  { name: 'Peugeot', initial: 'P', color: '#1B2D5B' },
  { name: 'Lexus', initial: 'L', color: '#1A1A1A' },
];

export function ManufacturersSection() {
  return (
    <section className="bg-slate-50 py-16 lg:py-20">
      <div className="mx-auto max-w-5xl px-4">
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            From Toyota to Mercedes &mdash; If It&apos;s in Lagos, We&apos;ll Find It
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-base text-slate-600">
            Our runners know every stall in Ladipo and ASPAMDA. Whatever your
            vehicle, we source the right part.
          </p>
        </div>

        <div className="grid grid-cols-5 gap-4 sm:gap-6 lg:grid-cols-10">
          {manufacturers.map((m) => (
            <div key={m.name} className="flex flex-col items-center gap-2">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold text-white"
                style={{ backgroundColor: m.color }}
              >
                {m.initial}
              </div>
              <span className="text-center text-xs font-medium text-slate-700">
                {m.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
