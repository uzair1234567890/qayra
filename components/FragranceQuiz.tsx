'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Sparkles, ArrowRight, Check, RefreshCw, ShoppingBag, ShieldCheck } from 'lucide-react';
import { useCart } from './CartContext';

const QUESTIONS = [
  {
    id: 'environment',
    title: '1. What is your primary driving environment?',
    options: [
      { label: 'Executive City Commutes & Business Meetings', family: 'Oud & Wood', mood: 'Commanding & Regal' },
      { label: 'Late Night Highway Cruises & Quiet Drives', family: 'Leather & Smoke', mood: 'Intense & Mysterious' },
      { label: 'Warm Sunlit Drives & Coastal Gateways', family: 'Fresh & Citrus', mood: 'Vibrant & Clean' },
      { label: 'Evening Dinners & Luxury Escapes', family: 'Amber & Spice', mood: 'Sensual & Enveloping' },
    ],
  },
  {
    id: 'notes',
    title: '2. Which scent profile appeals most to your senses?',
    options: [
      { label: 'Smoked Agarwood, Sandalwood & Spiced Balsam', family: 'Oud & Wood' },
      { label: 'Golden Baltic Amber, Clove & Sweet Cedar', family: 'Amber & Spice' },
      { label: 'Tuscan Upholstery Leather & Oakmoss', family: 'Leather & Smoke' },
      { label: 'Calabrian Bergamot, Neroli & Sunlit Vetiver', family: 'Fresh & Citrus' },
    ],
  },
  {
    id: 'cabin',
    title: '3. What atmosphere do you want inside your vehicle?',
    options: [
      { label: 'Rich, Deep & Sophisticated Presence', family: 'Oud & Wood' },
      { label: 'Warm, Cozy & Inviting Comfort', family: 'Amber & Spice' },
      { label: 'Bold, Masculine & Premium Leather Accent', family: 'Leather & Smoke' },
      { label: 'Crisp, Energizing & Pure Atmosphere', family: 'Fresh & Citrus' },
    ],
  },
];

const PRESETS: Record<string, { id: string; name: string; slug: string; price: number; image: string; scentFamily: string; matchScore: number; tagline: string }> = {
  'Oud & Wood': {
    id: 'shadow-elixir',
    name: 'Qayra - Shadow Elixir',
    slug: 'shadow-elixir',
    price: 1499,
    image: '/images/products/shadow_elixir.jpg',
    scentFamily: 'Oud & Wood',
    matchScore: 98,
    tagline: 'Rare smoked agarwood & sandalwood crafted for executive cabin presence.',
  },
  'Amber & Spice': {
    id: 'velvet-midnight',
    name: 'Qayra - Velvet Midnight',
    slug: 'velvet-midnight',
    price: 1499,
    image: '/images/products/velvet_midnight.jpg',
    scentFamily: 'Amber & Spice',
    matchScore: 96,
    tagline: 'Golden Baltic amber & Atlas cedar for a warm, enveloping vehicle atmosphere.',
  },
  'Leather & Smoke': {
    id: 'obsidian-mist',
    name: 'Qayra - Obsidian Mist',
    slug: 'obsidian-mist',
    price: 1499,
    image: '/images/products/obsidian_mist.jpg',
    scentFamily: 'Leather & Smoke',
    matchScore: 97,
    tagline: 'Tuscan leather upholstery accord & smoked oakmoss for late night cruises.',
  },
  'Fresh & Citrus': {
    id: 'sacred-nile',
    name: 'Qayra - Sacred Nile',
    slug: 'sacred-nile',
    price: 1499,
    image: '/images/products/sacred_nile.jpg',
    scentFamily: 'Fresh & Citrus',
    matchScore: 95,
    tagline: 'Sun-drenched Calabrian bergamot & neroli roots for radiant daily drives.',
  },
};

export default function FragranceQuiz() {
  const { addToCart, setIsCartOpen } = useCart();
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isCompleted, setIsCompleted] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);

  const handleSelectOption = (family: string) => {
    const nextAnswers = { ...answers, [QUESTIONS[currentStep].id]: family };
    setAnswers(nextAnswers);

    if (currentStep < QUESTIONS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setIsCompleted(true);
    }
  };

  const getMatchedResult = () => {
    const counts: Record<string, number> = {};
    Object.values(answers).forEach((family) => {
      counts[family] = (counts[family] || 0) + 1;
    });

    let topFamily = 'Oud & Wood';
    let maxCount = 0;
    Object.entries(counts).forEach(([family, count]) => {
      if (count > maxCount) {
        maxCount = count;
        topFamily = family;
      }
    });

    return PRESETS[topFamily] || PRESETS['Oud & Wood'];
  };

  const handleAddToCart = () => {
    const result = getMatchedResult();
    addToCart(
      {
        id: result.id,
        slug: result.slug,
        name: result.name,
        price: result.price,
        image: result.image,
        scentFamily: result.scentFamily,
      },
      1
    );
    setAddedToCart(true);
    setTimeout(() => {
      setAddedToCart(false);
      setIsCartOpen(true);
    }, 1000);
  };

  const handleReset = () => {
    setCurrentStep(0);
    setAnswers({});
    setIsCompleted(false);
    setAddedToCart(false);
  };

  const result = isCompleted ? getMatchedResult() : null;

  return (
    <div className="bg-[#141210] border border-[#29241F] rounded-2xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
      {/* Background Decorative Accent */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-[#D4AF37]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-3xl mx-auto space-y-8 relative z-10">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center space-x-2 bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Interactive Olfactory Finder</span>
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#FDFBF7]">
            Discover Your Signature Scent
          </h2>
          <p className="text-xs sm:text-sm text-[#A0988E]">
            Answer 3 quick questions to match your driving personality with the perfect Qayra fragrance.
          </p>
        </div>

        {!isCompleted ? (
          <div className="space-y-6">
            {/* Step Progress Bar */}
            <div className="flex items-center justify-between text-xs text-[#787063] pb-2 border-b border-[#29241F]">
              <span>Step {currentStep + 1} of {QUESTIONS.length}</span>
              <div className="flex space-x-1.5">
                {QUESTIONS.map((_, idx) => (
                  <div
                    key={idx}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      idx === currentStep
                        ? 'w-8 bg-[#D4AF37]'
                        : idx < currentStep
                        ? 'w-3 bg-[#C5A059]'
                        : 'w-3 bg-[#29241F]'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Question Box */}
            <div className="space-y-4">
              <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#FDFBF7]">
                {QUESTIONS[currentStep].title}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                {QUESTIONS[currentStep].options.map((opt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectOption(opt.family)}
                    className="p-4 rounded-xl bg-[#1A1815] border border-[#29241F] hover:border-[#D4AF37] text-left transition-all duration-300 group hover:shadow-lg flex items-center justify-between"
                  >
                    <span className="text-xs sm:text-sm text-[#E6E1DA] group-hover:text-[#FDFBF7] font-medium leading-snug">
                      {opt.label}
                    </span>
                    <ArrowRight className="w-4 h-4 text-[#787063] group-hover:text-[#D4AF37] group-hover:translate-x-1 transition-all shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Match Result Screen */
          result && (
            <div className="space-y-6 bg-[#1A1815] border border-[#C5A059]/40 rounded-xl p-6 sm:p-8 animate-fadeIn shadow-2xl">
              <div className="flex flex-col md:flex-row items-center gap-6">
                {/* Result Bottle Image */}
                <div className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-xl overflow-hidden border border-[#D4AF37] shrink-0 shadow-xl">
                  <Image
                    src={result.image}
                    alt={result.name}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute top-2 right-2 bg-[#D4AF37] text-[#0A0908] text-[10px] font-bold px-2 py-0.5 rounded shadow">
                    {result.matchScore}% Match
                  </div>
                </div>

                {/* Result Details */}
                <div className="space-y-3 text-center md:text-left flex-1">
                  <span className="text-[10px] uppercase tracking-widest text-[#D4AF37] font-bold">
                    Your Perfect Olfactory Match
                  </span>
                  <h3 className="font-serif text-2xl sm:text-3xl font-bold text-[#FDFBF7]">
                    {result.name}
                  </h3>
                  <p className="text-xs sm:text-sm text-[#A0988E] leading-relaxed">
                    {result.tagline}
                  </p>

                  <div className="flex items-center justify-center md:justify-start space-x-4 pt-1">
                    <span className="font-serif text-xl font-bold text-[#D4AF37]">
                      ₹{result.price.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[10px] text-[#52B788] uppercase tracking-wider flex items-center gap-1 font-semibold">
                      <ShieldCheck className="w-3.5 h-3.5" /> 30-Day Longevity Included
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-[#29241F] flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  onClick={handleReset}
                  className="w-full sm:w-auto px-5 py-3 bg-[#141210] hover:bg-[#29241F] text-[#A0988E] hover:text-[#FDFBF7] text-xs font-semibold rounded flex items-center justify-center space-x-2 transition-all border border-[#29241F]"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retake Quiz</span>
                </button>

                <button
                  onClick={handleAddToCart}
                  disabled={addedToCart}
                  className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-[#D4AF37] to-[#C5A059] text-[#0A0908] font-bold text-xs uppercase tracking-[0.2em] rounded flex items-center justify-center space-x-2 hover:brightness-110 transition-all shadow-xl active:scale-95 disabled:opacity-80"
                >
                  {addedToCart ? (
                    <>
                      <Check className="w-4 h-4 text-[#0A0908]" />
                      <span>Added to Bag!</span>
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="w-4 h-4" />
                      <span>Add Matched Fragrance (₹{result.price})</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
