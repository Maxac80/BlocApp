'use client';

import { useState } from 'react';

interface FAQItem {
  question: string;
  answer: string;
}

const faqData: FAQItem[] = [
  {
    question: 'Cât durează implementarea?',
    answer: 'Aproximativ 2 ore pentru configurarea inițială completă: adaugi asociația, blocurile, scările, apartamentele, configurezi tipurile de cheltuieli și introduci balanțele inițiale. După aceea, lucrul lunar ia ~30 minute.',
  },
  {
    question: 'Funcționează pentru asociații cu mai multe blocuri?',
    answer: 'Da, absolut. Suportăm structuri complexe: o asociație poate avea multiple blocuri, fiecare bloc poate avea multiple scări, iar fiecare scară multiple apartamente. Calculele se pot face la nivel de bloc sau centralizat pentru toată asociația.',
  },
  {
    question: 'Pot personaliza tipurile de cheltuieli?',
    answer: 'Da. Pe lângă cele 11 tipuri predefinite (apă caldă, apă rece, canal, lift, energie, interfon, asociație, salarii, ANAF, căldură, spații comerciale), poți adăuga nelimitat tipuri custom cu reguli proprii de distribuție.',
  },
  {
    question: 'Ce metode de distribuție suportați?',
    answer: 'Suportăm toate metodele uzuale: per apartament (egal), per persoană (bazat pe număr locuitori), consum (bazat pe indexuri contoare), sumă individuală (diferit per apartament), și cotă parte indiviza (procent proprietate).',
  },
  {
    question: 'Proprietarii trebuie să plătească separat pentru acces?',
    answer: 'Nu, costul este suportat de asociație în cadrul abonamentului. Proprietarii au acces gratuit la portalul lor unde pot vedea soldul, istoric și pot plăti online.',
  },
  {
    question: 'Cât de sigure sunt datele mele?',
    answer: 'Foarte sigure. Folosim Firebase (Google Cloud Platform) cu criptare end-to-end (HTTPS), backup automat zilnic, acces bazat pe autentificare, separare completă între asociații și conformitate GDPR.',
  },
  {
    question: 'Pot anula oricând?',
    answer: 'Da, fără penalități. Nu avem contracte pe termen lung. Plătești lunar și poți anula oricând din setări. Datele tale rămân accesibile 90 de zile după anulare pentru export.',
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="py-20 bg-gray-50">
      <div className="mx-auto max-w-3xl px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Întrebări Frecvente
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Răspunsuri la cele mai comune întrebări despre BlocApp
          </p>
        </div>

        <div className="space-y-4">
          {faqData.map((faq, index) => (
            <div
              key={index}
              className="bg-white rounded-lg border border-gray-200 overflow-hidden"
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <span className="text-lg font-semibold text-gray-900">
                  {faq.question}
                </span>
                <svg
                  className={`h-6 w-6 text-primary-600 transition-transform duration-200 ${
                    openIndex === index ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              <div
                className={`transition-all duration-200 ease-in-out ${
                  openIndex === index
                    ? 'max-h-96 opacity-100'
                    : 'max-h-0 opacity-0 overflow-hidden'
                }`}
              >
                <div className="px-6 pb-4 text-gray-600">
                  {faq.answer}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-gray-600">
            Mai ai întrebări?{' '}
            <a
              href="/contact"
              className="font-semibold text-primary-600 hover:text-primary-700"
            >
              Contactează-ne
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
