'use client';

import React, { useState } from 'react';
import { ChevronDown, HelpCircle, Sparkles } from 'lucide-react';

export const FAQ_DATA = [
  {
    question: 'How is Qayra luxury hanging car perfume different from ordinary car air fresheners (like vent clips, sprays, or gel cans)?',
    answer:
      'Unlike synthetic car air freshener sprays, plastic AC vent clips, or under-seat gel pods from mass-market brands (such as Ambipur, Godrej Aer, or Areon) that rely on harsh chemical aerosols and fade within days, Qayra crafts 10ml hanging car perfumes using concentrated, non-alcoholic fine fragrance oils. Diffused naturally through an artisanal porous beechwood cap, each 10ml bottle delivers 30+ days of continuous, headache-free vehicle cabin scent.',
  },
  {
    question: 'What scent notes and fragrance families are available in the collection?',
    answer:
      'Our signature collection features four handcrafted olfactory profiles:\n• Shadow Elixir (Oud & Wood): Smoked Cambodian agarwood, royal amber, and golden saffron.\n• Velvet Midnight (Amber & Spice): Warm Baltic amber, Atlas cedarwood, and cinnamon bark.\n• Obsidian Mist (Leather & Smoke): Bold Tuscan leather upholstery accord, tobacco blossom, and oakmoss.\n• Sacred Nile (Fresh & Citrus): Crisp Calabrian bergamot, blood orange, and sunlit vetiver.',
  },
  {
    question: 'How do I use the 10ml hanging diffuser bottle in my car?',
    answer:
      'Using your Qayra hanging car perfume is simple:\n1. Unscrew the handcrafted beechwood cap and remove the inner leak-proof safety plug.\n2. Screw the wooden cap firmly back on.\n3. Invert the 10ml bottle upside down for 2–3 seconds to allow the fragrance oil to saturate the porous wood.\n4. Hang the bottle from your rearview mirror using the attached cord. Natural cabin air movement and AC circulation will gently release the scent. Simply invert for 1–2 seconds once a week to refresh.',
  },
  {
    question: 'Can I buy Qayra car perfumes online across India? What is the price?',
    answer:
      'Yes, you can buy genuine Qayra car perfumes online directly on qayra.in. Individual 10ml bottles are priced starting at ₹395 (down from ₹1,799+), and our 3-bottle Executive Trio Gift Set combo pack is available for ₹999. Every single order includes 100% free express delivery across all pin-codes in India with real-time tracking updates.',
  },
  {
    question: 'Are Qayra car perfumes suitable for both men and women?',
    answer:
      'Yes, all Qayra automotive fragrances are masterfully crafted unisex perfumes suitable for both men and women. Blends like Obsidian Mist (leather & smoke) and Shadow Elixir (oud & amber) provide commanding executive depth, while Sacred Nile (citrus & bergamot) and Velvet Midnight (warm amber) deliver universal, uplifting comfort for everyday commutes and road trips.',
  },
];

export default function HomeFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  // Structured FAQPage Schema for Google Search Rich Snippets
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_DATA.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer.replace(/\n/g, '<br/>'),
      },
    })),
  };

  return (
    <div className="space-y-10">
      {/* Google FAQPage JSON-LD Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center space-x-1.5 text-xs font-serif italic text-[#D4AF37] uppercase tracking-[0.3em]">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Vehicle Fragrance Guide</span>
        </div>
        <h2 className="font-serif text-3xl sm:text-5xl font-bold text-[#FDFBF7]">
          Frequently Asked Questions
        </h2>
        <p className="text-xs sm:text-sm text-[#A0988E] max-w-xl mx-auto">
          Everything you need to know about our 10ml hanging car perfumes, artisan fragrance notes, and vehicle diffusion.
        </p>
      </div>

      {/* Accordion List */}
      <div className="max-w-4xl mx-auto space-y-4">
        {FAQ_DATA.map((item, index) => {
          const isOpen = openIndex === index;
          return (
            <div
              key={index}
              className="bg-[#141210] border border-[#29241F] hover:border-[#D4AF37]/50 rounded-xl overflow-hidden transition-all duration-300"
            >
              <button
                type="button"
                onClick={() => toggleFAQ(index)}
                className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 focus:outline-none"
                aria-expanded={isOpen}
              >
                <span className="font-serif text-base sm:text-lg font-semibold text-[#FDFBF7] flex items-center gap-3">
                  <span className="text-xs font-mono text-[#D4AF37] px-2 py-0.5 rounded bg-[#1A1815] border border-[#C5A059]/30">
                    0{index + 1}
                  </span>
                  {item.question}
                </span>
                <ChevronDown
                  className={`w-5 h-5 text-[#D4AF37] flex-shrink-0 transition-transform duration-300 ${
                    isOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {isOpen && (
                <div className="px-5 pb-6 sm:px-6 sm:pb-7 text-xs sm:text-sm text-[#A0988E] leading-relaxed border-t border-[#29241F]/60 pt-4 whitespace-pre-line">
                  {item.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
