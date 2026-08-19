'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { marketingType } from '@/components/layout/marketing-canvas';
import { marketingFont } from '@/lib/fonts/marketing-font';

const faqs = [
  {
    question: 'How do I find the correct part for my truck?',
    answer:
      "Finding the right part is simple. Search using your truck's VIN, OEM part number, product name, or browse by category. If you're unsure, our parts specialists can help you identify the exact component you need before you place your order.",
  },
  {
    question: 'Do you sell genuine OEM parts or aftermarket parts?',
    answer:
      'We source both genuine OEM and quality aftermarket parts from Ladipo and ASPAMDA, depending on what you need and what is available. You confirm the part from photos before it leaves the market.',
  },
  {
    question: 'How do I know if a part is compatible with my vehicle?',
    answer:
      'Tell us the make, model, year, and spec (or send a photo / OEM code). Our runners match the part to your vehicle and send verification photos so you can approve it before dispatch.',
  },
  {
    question: 'How long does shipping take?',
    answer:
      'Express delivery is 45 minutes within 10km of the market. Standard delivery covers the rest of Lagos within 2 hours.',
  },
  {
    question: "Can I return a part if it doesn't fit?",
    answer:
      "We verify every part with photos before dispatch. If you still receive the wrong part, we'll send a replacement immediately at no extra cost.",
  },
];

function FaqItem({
  question,
  answer,
  defaultOpen = false,
}: {
  question: string;
  answer: string;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div
      className={`${marketingFont.className} flex w-full flex-col justify-center rounded-xl bg-white p-5`}
    >
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="flex w-full items-center justify-between gap-4 text-left"
        aria-expanded={isOpen}
      >
        <span className="text-base font-medium leading-5 tracking-[-0.01em] text-[#232323] sm:text-lg">
          {question}
        </span>
        <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-lg bg-white">
          <ChevronDown
            className={cn(
              'h-6 w-6 text-[#505050] transition-transform duration-200',
              isOpen ? 'rotate-0' : '-rotate-90'
            )}
            strokeWidth={2}
          />
        </span>
      </button>
      {isOpen && (
        <p className="mt-5 max-w-[844px] text-sm font-normal leading-5 tracking-[-0.01em] text-[#838383]">
          {answer}
        </p>
      )}
    </div>
  );
}

export function FaqSection() {
  return (
    <section id="faq" className="scroll-mt-20 bg-[#F8F8F8] px-4 py-16 sm:px-6">
      <div className="mx-auto flex w-full max-w-[959px] flex-col items-center gap-[76px]">
        <h2 className={`font-marketing-display text-center text-[#232323] ${marketingType.section}`}>
          Frequently Asked Questions
        </h2>

        <div className="flex w-full flex-col gap-3">
          {faqs.map((faq, index) => (
            <FaqItem key={faq.question} {...faq} defaultOpen={index === 0} />
          ))}
        </div>
      </div>
    </section>
  );
}
