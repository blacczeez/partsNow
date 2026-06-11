import { Star } from 'lucide-react';

const testimonials = [
  {
    name: 'Chidi O.',
    location: 'Ikeja, Lagos',
    role: 'Mechanic',
    quote:
      'I used to send my boy to Ladipo 3 times a day. Now I just send a voice note and the parts show up. I finish more jobs and my customers are happier.',
    rating: 5,
  },
  {
    name: 'Blessing A.',
    location: 'Lekki, Lagos',
    role: 'Car Owner',
    quote:
      'My mechanic kept telling me "the boy has gone to buy parts" for hours. With PartsNow I ordered the parts myself and they arrived before he finished draining the oil.',
    rating: 5,
  },
  {
    name: 'Emeka N.',
    location: 'Surulere, Lagos',
    role: 'Mechanic',
    quote:
      'The first time I tried it, I thought 45 minutes was a lie. The brake pads arrived in 38 minutes. I\'ve used it every week since.',
    rating: 5,
  },
];

export function TestimonialsSection() {
  return (
    <section className="bg-white px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-center text-2xl font-bold text-slate-900 sm:text-3xl">
          What Mechanics and Car Owners Say
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-slate-500">
          Real people, real orders, real time saved.
        </p>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="flex flex-col rounded-card border border-slate-200 bg-slate-50 p-6"
            >
              {/* Stars */}
              <div className="flex gap-0.5">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star
                    key={i}
                    className="h-4 w-4 fill-amber-400 text-amber-400"
                  />
                ))}
              </div>

              {/* Quote */}
              <p className="mt-4 flex-1 text-sm leading-relaxed text-slate-700">
                &ldquo;{t.quote}&rdquo;
              </p>

              {/* Author */}
              <div className="mt-5 border-t border-slate-200 pt-4">
                <p className="text-sm font-semibold text-slate-900">{t.name}</p>
                <p className="text-xs text-slate-500">
                  {t.role} &middot; {t.location}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
