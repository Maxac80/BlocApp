import type { Metadata } from 'next';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Button from '@/components/ui/Button';

export const metadata: Metadata = {
  title: 'Funcționalități BlocApp | Software Complet Administrare Asociație',
  description: 'Calculare automată, gestiune facturi, încasări, chitanțe, portal proprietari, rapoarte. Tot ce ai nevoie pentru administrarea profesionistă a blocului.',
};

const featureCategories = [
  {
    name: 'Administrare Structură',
    icon: '🏢',
    features: [
      'Asociații multiple (dacă administrezi mai multe)',
      'Blocuri nelimitate per asociație',
      'Scări nelimitate per bloc',
      'Apartamente nelimitate per scară',
      'Date complete proprietari (nume, telefon, email, CNP)',
      'Număr persoane per apartament (actualizabil)',
      'Cota parte indiviza per apartament',
      'Import din Excel (template furnizat)',
    ],
  },
  {
    name: 'Gestiune Cheltuieli',
    icon: '💰',
    features: [
      '11 tipuri de cheltuieli predefinite (apă, lift, energie, etc.)',
      'Tipuri custom nelimitate',
      '5 metode de distribuție (per apt, per persoană, consum, individual, cotă parte)',
      'Excludere apartamente din anumite cheltuieli',
      'Participare parțială (ex: apartament plătește 50% lift)',
      'Indexuri contor cu istoric complet',
      'Facturi încărcate (PDF/imagine) și asociate cheltuielilor',
      'Gestionare furnizori cu date complete',
    ],
  },
  {
    name: 'Calculare Întreținere',
    icon: '🧮',
    features: [
      'Calcul automat repartizare cheltuieli',
      'Balanțe reportate automat din luna precedentă',
      'Penalități calculate automat (rată configurabilă)',
      'Ajustări manuale per apartament (când e cazul)',
      'Breakdown detaliat cheltuieli per apartament',
      'Verificare automată totale (suma = repartizat)',
      'Preview înainte de publicare (mod draft)',
      'Istoric complet arhivat per lună',
    ],
  },
  {
    name: 'Încasări și Plăți',
    icon: '💳',
    features: [
      'Înregistrare plăți (cash, transfer, card)',
      'Generare automată chitanțe cu număr unic',
      'Alocare inteligentă plată (penalități → restante → curent)',
      'Tracking sold per apartament în timp real',
      'Istoric plăți complet cu data și sumă',
      'Export chitanțe PDF (regenerare oricând)',
      'Statistici încasări (procent plătit, apartamente restante)',
      'Plăți online cu cardul (integrare Stripe - opțional)',
    ],
  },
  {
    name: 'Rapoarte și Export',
    icon: '📊',
    features: [
      'Export PDF tabel întreținere (pentru avizier)',
      'Export Excel tabel întreținere',
      'Export lista apartamente cu date complete',
      'Raport financiar lunar (venituri, cheltuieli, balanță)',
      'Raport apartamente restante',
      'Raport consum utilități (evoluție în timp)',
      'Customizare template PDF (logo asociație)',
    ],
  },
  {
    name: 'Portal Proprietari',
    icon: '🔐',
    features: [
      'Login separat pentru fiecare proprietar',
      'Dashboard personal cu sold curent',
      'Detalii întreținere lună curentă (breakdown cheltuieli)',
      'Istoric plăți cu chitanțe descărcabile',
      'Evoluție sold în timp (grafic)',
      'Plată online cu cardul (Stripe/PayU)',
      'Trimitere indexuri contor online',
      'Notificări email (listă nouă, plată înregistrată)',
      'Profil editable (telefon, email)',
    ],
  },
];

const comparisonData = [
  { feature: 'Timp necesar lunar', excel: '3-4 ore', blocapp: '30 minute', competitor: '1-2 ore' },
  { feature: 'Risc erori de calcul', excel: 'Mare', blocapp: 'Zero', competitor: 'Scăzut' },
  { feature: 'Istoricizare', excel: 'Manual', blocapp: 'Automat', competitor: 'Automat' },
  { feature: 'Portal proprietari', excel: '❌', blocapp: '✅', competitor: '✅' },
  { feature: 'Plăți online', excel: '❌', blocapp: '✅', competitor: '✅ (extra)' },
  { feature: 'Mobile responsive', excel: '❌', blocapp: '✅', competitor: '🟡' },
  { feature: 'Onboarding', excel: 'Nu există', blocapp: '2 ore ghidate', competitor: '1-2 zile' },
  { feature: 'Suport', excel: '❌', blocapp: 'Email + chat', competitor: 'Email' },
  { feature: 'Cost/lună', excel: 'Gratuit', blocapp: 'De la 149 lei', competitor: '200-400 lei' },
];

export default function FunctionalitatiPage() {
  return (
    <>
      <Header />

      <main>
        {/* Hero Section */}
        <section className="bg-gradient-to-b from-primary-50 to-white py-10 sm:py-16 lg:py-20">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                Funcționalități complete pentru administrarea profesionistă
              </h1>
              <p className="mt-6 text-lg text-gray-600 max-w-3xl mx-auto">
                Tot ce ai nevoie într-o singură platformă. De la structura blocului până la rapoarte financiare, BlocApp te acoperă.
              </p>
              <div className="mt-10">
                <Button href="https://app.blocapp.ro?register=true" size="lg">
                  Încearcă Gratuit 90 Zile
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Categories */}
        <section className="py-16 bg-white">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="space-y-16">
              {featureCategories.map((category, categoryIndex) => (
                <div key={categoryIndex}>
                  <div className="flex items-center gap-4 mb-8">
                    <div className="flex items-center justify-center w-16 h-16 bg-primary-100 rounded-xl text-3xl">
                      {category.icon}
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900">
                      {category.name}
                    </h2>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    {category.features.map((feature, featureIndex) => (
                      <div
                        key={featureIndex}
                        className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-all"
                      >
                        <svg
                          className="h-6 w-6 text-secondary-600 flex-shrink-0 mt-0.5"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span className="text-gray-900">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Comparison Table */}
        <section className="py-16 bg-gray-50">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Comparație: BlocApp vs Excel vs Competitori
              </h2>
              <p className="text-lg text-gray-600">
                Vezi cum se compară BlocApp cu alternativele
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full bg-white rounded-xl shadow-sm border border-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Criteriu
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-600">
                      Excel
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-primary-900 bg-primary-50">
                      BlocApp
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-600">
                      Competitori
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {comparisonData.map((row, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {row.feature}
                      </td>
                      <td className="px-6 py-4 text-sm text-center text-gray-600">
                        {row.excel}
                      </td>
                      <td className="px-6 py-4 text-sm text-center font-semibold text-primary-900 bg-primary-50/30">
                        {row.blocapp}
                      </td>
                      <td className="px-6 py-4 text-sm text-center text-gray-600">
                        {row.competitor}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mt-8 text-center text-lg font-semibold text-gray-900">
              BlocApp oferă cel mai bun raport calitate-preț din piață
            </p>
          </div>
        </section>

        {/* Security & Compliance */}
        <section className="py-16 bg-white">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Securitate și Administrare
              </h2>
              <p className="text-lg text-gray-600">
                Datele tale sunt în siguranță
              </p>
            </div>

            <div className="grid md:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-secondary-100 rounded-full mb-4">
                  <svg className="h-8 w-8 text-secondary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  Autentificare Sigură
                </h3>
                <p className="text-sm text-gray-600">
                  Email + parolă cu criptare
                </p>
              </div>

              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-secondary-100 rounded-full mb-4">
                  <svg className="h-8 w-8 text-secondary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  Backup Automat
                </h3>
                <p className="text-sm text-gray-600">
                  Zilnic pe Google Cloud
                </p>
              </div>

              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-secondary-100 rounded-full mb-4">
                  <svg className="h-8 w-8 text-secondary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  GDPR Compliant
                </h3>
                <p className="text-sm text-gray-600">
                  Conformitate completă
                </p>
              </div>

              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-secondary-100 rounded-full mb-4">
                  <svg className="h-8 w-8 text-secondary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  Roluri Utilizatori
                </h3>
                <p className="text-sm text-gray-600">
                  Admin, Președinte, Cenzor
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-primary-600">
          <div className="mx-auto max-w-3xl px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Gata să testezi toate aceste funcționalități?
            </h2>
            <p className="text-xl text-primary-100 mb-8">
              Încearcă gratuit 90 de zile. Fără card, fără obligații.
            </p>
            <a
              href="https://app.blocapp.ro?register=true"
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold rounded-lg bg-white text-primary-600 hover:bg-primary-50 hover:text-primary-700 transition-all shadow-lg hover:shadow-xl"
            >
              Creează Cont Gratuit
            </a>
            <p className="mt-6 text-sm text-primary-200">
              Ai întrebări despre funcționalități?{' '}
              <a href="/contact" className="underline hover:text-white">
                Contactează-ne
              </a>
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
