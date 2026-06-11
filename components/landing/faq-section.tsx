'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

const faqs = [
  {
    question: 'How fast is delivery?',
    answer:
      'Express delivery is 45 minutes within 10km of the market. Standard delivery covers the rest of Lagos within 2 hours.',
  },
  {
    question: 'What markets do you source from?',
    answer:
      'Ladipo Market (Mushin) and ASPAMDA (Trade Fair Complex). These are the two largest auto parts markets in Lagos.',
  },
  {
    question: 'How do I order via WhatsApp?',
    answer:
      'Send a voice note or text message to our WhatsApp number describing the part you need, your vehicle make/model/year, and your delivery address. We\'ll send you a quote.',
  },
  {
    question: 'What payment methods do you accept?',
    answer:
      'Wallet (pre-loaded balance), bank card, bank transfer, and cash on delivery (for orders under \u20A6100,000).',
  },
  {
    question: 'What if the part is wrong?',
    answer:
      'We verify every part with photos before dispatch. If you still receive the wrong part, we\'ll send a replacement immediately at no extra cost.',
  },
  {
    question: 'How is pricing determined?',
    answer:
      'We add a 15% markup to the vendor price to cover sourcing, quality checks, and platform costs. Delivery is \u20A61,500, or free for orders above \u20A650,000.',
  },
  {
    question: 'Can I track my order?',
    answer:
      'Yes. Once your order is dispatched, you get a live tracking link showing the rider\'s location and ETA.',
  },
  {
    question: 'Do you offer credit?',
    answer:
      'We\'re rolling out a buy-now-pay-later option for trusted mechanics. Contact us to learn more.',
  },
];

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-slate-200">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between py-4 text-left"
      >
        <span className="pr-4 text-sm font-medium text-slate-900 sm:text-base">
          {question}
        </span>
        <ChevronDown
          className={cn(
            'h-5 w-5 shrink-0 text-slate-400 transition-transform',
            isOpen && 'rotate-180'
          )}
        />
      </button>
      {isOpen && (
        <p className="pb-4 text-sm text-slate-500">{answer}</p>
      )}
    </div>
  );
}

export function FaqSection() {
  return (
    <section id="faq" className="bg-slate-50 px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-center text-2xl font-bold text-slate-900 sm:text-3xl">
          Frequently Asked Questions
        </h2>

        <div className="mt-10">
          {faqs.map(({ question, answer }) => (
            <FaqItem key={question} question={question} answer={answer} />
          ))}
        </div>
      </div>
    </section>
  );
}
