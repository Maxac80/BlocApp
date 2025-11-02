'use client';

import { useState } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

export default function DemoPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    apartamente: '',
  });
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');

    // Simulare trimitere (în viitor, aici va fi Firebase Functions)
    setTimeout(() => {
      setStatus('success');
      setFormData({ name: '', email: '', phone: '', apartamente: '' });
      setTimeout(() => setStatus('idle'), 5000);
    }, 1500);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <>
      <Header />

      <main>
        {/* Hero Section */}
        <section className="bg-gradient-to-b from-primary-50 to-white py-20">
          <div className="mx-auto max-w-4xl px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                Vezi BlocApp în Acțiune
              </h1>
              <p className="mt-6 text-lg text-gray-600">
                Demo interactiv de 3 minute sau programează o prezentare personalizată cu echipa noastră.
              </p>
            </div>
          </div>
        </section>

        {/* Video Demo Section */}
        <section className="py-16 bg-white">
          <div className="mx-auto max-w-5xl px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Demo Video Interactiv (3 minute)
              </h2>
              <p className="text-lg text-gray-600">
                Urmărește cum se lucrează în BlocApp, de la adăugarea cheltuielilor până la generarea listei de întreținere
              </p>
            </div>

            {/* Video Placeholder */}
            <div className="aspect-video rounded-2xl bg-gray-100 border-2 border-gray-200 shadow-xl overflow-hidden mb-8">
              <div className="flex items-center justify-center h-full bg-gradient-to-br from-primary-100 to-primary-200">
                <div className="text-center px-8">
                  <div className="inline-flex items-center justify-center w-24 h-24 bg-white rounded-full shadow-lg mb-6">
                    <svg className="w-12 h-12 text-primary-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                  <p className="text-xl font-semibold text-primary-900">
                    Demo Video BlocApp
                  </p>
                  <p className="text-sm text-primary-700 mt-2">
                    (Video va fi adăugat în curând)
                  </p>
                </div>
              </div>
            </div>

            {/* Video Chapters */}
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-primary-600 text-white rounded-full text-sm font-bold">
                    1
                  </div>
                  <h3 className="font-semibold text-gray-900">Setup Inițial</h3>
                </div>
                <p className="text-sm text-gray-600">
                  Cum adaugi blocul, scările, apartamentele și proprietarii în 10 minute
                </p>
              </div>

              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-primary-600 text-white rounded-full text-sm font-bold">
                    2
                  </div>
                  <h3 className="font-semibold text-gray-900">Calculare Întreținere</h3>
                </div>
                <p className="text-sm text-gray-600">
                  Adaugi cheltuielile și BlocApp calculează automat lista pentru fiecare apartament
                </p>
              </div>

              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-primary-600 text-white rounded-full text-sm font-bold">
                    3
                  </div>
                  <h3 className="font-semibold text-gray-900">Export și Plăți</h3>
                </div>
                <p className="text-sm text-gray-600">
                  Generezi PDF pentru avizier și înregistrezi plățile cu chitanțe automate
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Screenshots Section */}
        <section className="py-16 bg-gray-50">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Explorează Interfața
              </h2>
              <p className="text-lg text-gray-600">
                Design intuitiv, totul la un click distanță
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Screenshot Placeholders */}
              {[
                { title: 'Dashboard Principal', desc: 'Vizualizare rapidă a statusului asociației' },
                { title: 'Calculator Întreținere', desc: 'Interfața principală de lucru' },
                { title: 'Gestiune Cheltuieli', desc: 'Adăugare și editare cheltuieli' },
                { title: 'Portal Proprietari', desc: 'Cum văd proprietarii informațiile' },
              ].map((item, index) => (
                <div key={index} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-md hover:shadow-lg transition-shadow">
                  <div className="aspect-video bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center">
                    <div className="text-center px-6">
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-lg shadow-md mb-3">
                        <span className="text-2xl font-bold text-primary-600">B</span>
                      </div>
                      <p className="text-sm text-primary-700">Screenshot {item.title}</p>
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
                    <p className="text-gray-600">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Live Demo Request */}
        <section className="py-16 bg-white">
          <div className="mx-auto max-w-4xl px-6 lg:px-8">
            <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl shadow-xl overflow-hidden">
              <div className="grid lg:grid-cols-2 gap-8">
                {/* Left - Info */}
                <div className="p-8 lg:p-12 text-white">
                  <h2 className="text-3xl font-bold mb-4">
                    Programează Demo Live
                  </h2>
                  <p className="text-primary-100 mb-6">
                    Vrei să vezi BlocApp personalizat pentru situația ta? Programează o sesiune de 30 minute cu echipa noastră.
                  </p>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <svg className="h-6 w-6 text-secondary-300 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>Demo personalizat pentru asociația ta</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <svg className="h-6 w-6 text-secondary-300 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>Răspunsuri la toate întrebările tale</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <svg className="h-6 w-6 text-secondary-300 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>Plan de migrare de la Excel la BlocApp</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <svg className="h-6 w-6 text-secondary-300 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>Fără presiune de vânzare</span>
                    </li>
                  </ul>
                </div>

                {/* Right - Form */}
                <div className="bg-white p-8 lg:p-12">
                  <h3 className="text-xl font-bold text-gray-900 mb-6">
                    Solicită Demo Live
                  </h3>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-900 mb-2">
                        Nume *
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        required
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="Ion Popescu"
                      />
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-900 mb-2">
                        Email *
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="ion@example.com"
                      />
                    </div>

                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-900 mb-2">
                        Telefon *
                      </label>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        required
                        value={formData.phone}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="0721 123 456"
                      />
                    </div>

                    <div>
                      <label htmlFor="apartamente" className="block text-sm font-medium text-gray-900 mb-2">
                        Câte apartamente administrezi? *
                      </label>
                      <select
                        id="apartamente"
                        name="apartamente"
                        required
                        value={formData.apartamente}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      >
                        <option value="">Alege...</option>
                        <option value="1-30">1-30 apartamente</option>
                        <option value="30-50">30-50 apartamente</option>
                        <option value="50-100">50-100 apartamente</option>
                        <option value="100-200">100-200 apartamente</option>
                        <option value="200+">200+ apartamente</option>
                      </select>
                    </div>

                    {status === 'success' && (
                      <div className="p-4 bg-secondary-50 border border-secondary-200 rounded-lg">
                        <p className="text-secondary-800 font-medium text-sm">
                          ✓ Cererea ta a fost trimisă! Te contactăm în maxim 24 ore pentru a programa demo-ul.
                        </p>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={status === 'sending'}
                      className="w-full px-6 py-3 text-base font-semibold rounded-lg bg-primary-600 text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {status === 'sending' ? 'Se trimite...' : 'Programează Demo'}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-primary-600">
          <div className="mx-auto max-w-3xl px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Sau începe direct cu trial gratuit
            </h2>
            <p className="text-xl text-primary-100 mb-8">
              30 de zile, fără card, fără obligații. Testează tot ce ai văzut în demo.
            </p>
            <a
              href="/trial"
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold rounded-lg bg-white text-primary-600 hover:bg-primary-50 hover:text-primary-700 transition-all shadow-lg hover:shadow-xl"
            >
              Încearcă Gratuit 30 Zile
            </a>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
