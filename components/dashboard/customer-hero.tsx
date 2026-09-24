'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Search, Calendar, Car, LayoutGrid } from 'lucide-react';
import { VEHICLE_MAKES, getModelsForMake } from '@/lib/data/vehicle-makes-models';

const YEARS = Array.from({ length: 30 }, (_, i) => String(2025 - i));

export function CustomerHero() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [year, setYear] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');

  const models = brand ? getModelsForMake(brand) : [];

  function handleBrandChange(newBrand: string) {
    setBrand(newBrand);
    setModel('');
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    if (year) params.set('year', year);
    if (brand) params.set('make', brand);
    if (model) params.set('model', model);
    router.push(`/search?${params.toString()}`);
  }

  return (
    <div className="px-4 pt-4 lg:px-0 lg:pt-10">
      {/* Banner cards */}
      <div className="flex gap-2 h-[360px]">
        {/* Left banner — Explore Popular Categories */}
        <div className="relative flex-[60] overflow-hidden rounded-xl p-6 lg:p-8">
          {/* Background image — swap src to your actual banner */}
          <Image
            src="/images/customers/hero-left-bg.png"
            alt=""
            fill
            className="object-cover"
            priority
          />

          {/* <div className="relative z-10 flex h-full items-end justify-between gap-4">
            <div className="flex flex-col justify-between self-stretch">
              <div>
                <h2 className="text-2xl font-bold leading-tight text-white lg:text-3xl">
                  Explore Popular
                  <br />
                  Categories
                </h2>
                <p className="mt-2 max-w-60 text-sm leading-relaxed text-white/70">
                  The delivery was much faster than I expected, and the part matched perfectly.
                </p>
              </div>
              <Link
                href="/search"
                className="mt-5 inline-flex w-fit items-center justify-center rounded-lg bg-[#1A245C] px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                Browse Parts
              </Link>
            </div>
            <div className="hidden shrink-0 sm:block">
              <Image
                src="/images/customers/tires.png"
                alt="Car tires"
                width={400}
                height={360}
                className="h-auto w-56 object-contain lg:w-72"
              />
            </div>
          </div> */}
        </div>

        {/* Right banner — 100% reliable */}
        <div className="relative hidden flex-[40] overflow-hidden rounded-xl md:block">
          {/* Background image — swap src to your actual banner */}
          <Image
            src="/images/customers/hero-right-bg.png"
            alt=""
            fill
            className="object-cover"
          />
      
        </div>
      </div>

      {/* Search bar */}
      <div className="-mt-16 relative z-10 mx-auto w-[calc(100%-2rem)] max-w-4xl sm:w-[90%]">
        <div className="rounded-[1rem] bg-slate-50 p-5 lg:px-6 lg:py-4">
        <form
          onSubmit={handleSearch}
          className="rounded-2xl bg-[#C1BDE3] p-4 lg:px-5 lg:py-3"
        >
          {/* Text search */}
          <div className="flex items-center gap-3 rounded-lg bg-white px-4 py-2.5">
            <Search className="h-4 w-4 shrink-0 text-slate-900/40" />
            <input
              type="text"
              placeholder="What are you looking for"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-900/50 focus:outline-none"
            />
          </div>

          {/* Filters row */}
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
            {/* Year */}
            <div className="flex flex-1 items-center gap-2 rounded-lg bg-white px-3 py-2.5">
              <Calendar className="h-4 w-4 shrink-0 text-[#C8880A]" />
              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full appearance-none bg-transparent text-sm text-slate-900/50 focus:outline-none"
              >
                <option value="">Select year</option>
                {YEARS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {/* Brand */}
            <div className="flex flex-1 items-center gap-2 rounded-lg bg-white px-3 py-2.5">
              <Car className="h-4 w-4 shrink-0 text-[#C8880A]" />
              <select
                value={brand}
                onChange={(e) => handleBrandChange(e.target.value)}
                className="w-full appearance-none bg-transparent text-sm text-slate-900/50 focus:outline-none"
              >
                <option value="">Select brand</option>
                {VEHICLE_MAKES.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* Model */}
            <div className="flex flex-1 items-center gap-2 rounded-lg bg-white px-3 py-2.5">
              <LayoutGrid className="h-4 w-4 shrink-0 text-[#C8880A]" />
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                disabled={!brand}
                className="w-full appearance-none bg-transparent text-sm text-slate-900/50 disabled:text-slate-400 focus:outline-none"
              >
                <option value="">Select model</option>
                {models.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="shrink-0 rounded-lg bg-[#3E208D] px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              Browse part
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
}
