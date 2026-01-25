import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Button from '@/components/ui/Button';
import FAQ from '@/components/sections/FAQ';

export default function HomePage() {
  return (
    <>
      <Header />

      <main>
        {/* Hero Section */}
        <section className="relative bg-gradient-to-b from-primary-50 to-white py-10 sm:py-16 lg:py-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-8 items-center">
              {/* Left Column - Text */}
              <div>
                <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
                  Software modern pentru administrarea asociațiilor de proprietari
                </h1>
                <p className="mt-6 text-lg leading-8 text-gray-600">
                  Automatizează calculele, asigură transparența și economisește până la 10 ore lunar.
                  Platforma all-in-one pentru administratori profesioniști din România.
                </p>

                {/* CTA Buttons */}
                <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                  <Button href="https://app.blocapp.ro?register=true" size="lg">
                    Încearcă Gratuit 90 Zile
                  </Button>
                  <Button href="/demo" variant="outline" size="lg">
                    Vizionează Demo (3 min)
                  </Button>
                </div>

                {/* Trust Badges */}
                <div className="mt-8 flex flex-col gap-2 text-sm text-gray-600">
                  <p className="flex items-center gap-2">
                    <svg className="h-5 w-5 text-secondary-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Fără card necesar pentru trial
                  </p>
                  <p className="flex items-center gap-2">
                    <svg className="h-5 w-5 text-secondary-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Setup în 2 ore
                  </p>
                  <p className="flex items-center gap-2">
                    <svg className="h-5 w-5 text-secondary-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Suport în română
                  </p>
                </div>
              </div>

              {/* Right Column - Hero Image */}
              <div className="relative">
                <div className="aspect-[4/3] rounded-2xl bg-gray-100 border-2 border-gray-200 shadow-2xl overflow-hidden">
                  <img
                    src="/hero-dashboard-temp.jpg"
                    alt="Dashboard BlocApp - Administrare Asociații"
                    className="w-full h-full object-cover"
                  />
                </div>
                {/* Floating badge */}
                <div className="absolute -bottom-6 -left-6 bg-white rounded-xl shadow-xl p-4 border-2 border-primary-200">
                  <p className="text-sm font-semibold text-gray-900">✓ 100% Cloud</p>
                  <p className="text-xs text-gray-600">Acces de oriunde</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 bg-white">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                Tot ce ai nevoie pentru administrarea profesionistă
              </h2>
              <p className="mt-4 text-lg text-gray-600">
                De la structura blocului până la încasarea ultimului leu, BlocApp te ajută la fiecare pas
              </p>
            </div>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
              {/* Feature Cards */}
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-gray-200 p-8 hover:border-primary-300 hover:shadow-lg transition-all duration-200"
                >
                  <div className="flex items-center justify-center w-12 h-12 bg-primary-100 rounded-lg mb-4">
                    <span className="text-2xl">{feature.icon}</span>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits/Comparison Section */}
        <section className="py-20 bg-gray-50">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                De ce BlocApp în loc de Excel?
              </h2>
              <p className="mt-4 text-lg text-gray-600">
                Excel este gratuit, dar timpul tău nu este
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full bg-white rounded-xl shadow-sm border border-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Criteriu</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Excel</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-primary-900 bg-primary-50">BlocApp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {comparisonData.map((row, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">{row.criterion}</td>
                      <td className="px-6 py-4 text-sm text-center text-gray-600">{row.excel}</td>
                      <td className="px-6 py-4 text-sm text-center text-primary-900 bg-primary-50/30">
                        {row.blocapp}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mt-8 text-center text-lg font-semibold text-gray-900">
              BlocApp plătește singur investiția prin timpul economisit
            </p>
          </div>
        </section>

        {/* Social Proof / Testimonials Section */}
        <section className="py-20 bg-white">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                Ce spun administratorii care au făcut trecerea
              </h2>
              <p className="mt-4 text-lg text-gray-600">
                Peste 100+ asociații folosesc deja BlocApp pentru a-și simplifica munca
              </p>
            </div>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
              {testimonials.map((testimonial, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-gray-200 p-8 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} className="h-5 w-5 text-accent-500" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <p className="text-gray-700 mb-6 italic">"{testimonial.quote}"</p>
                  <div>
                    <p className="font-semibold text-gray-900">{testimonial.author}</p>
                    <p className="text-sm text-gray-600">{testimonial.role}</p>
                    <p className="text-sm text-gray-500">{testimonial.association}</p>
                    <p className="text-xs text-gray-400 mt-1">{testimonial.details}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Stats */}
            <div className="mt-16 grid grid-cols-2 gap-8 md:grid-cols-4">
              <div className="text-center">
                <p className="text-4xl font-bold text-primary-600">100+</p>
                <p className="mt-2 text-sm text-gray-600">Asociații active</p>
              </div>
              <div className="text-center">
                <p className="text-4xl font-bold text-primary-600">4,500+</p>
                <p className="mt-2 text-sm text-gray-600">Apartamente</p>
              </div>
              <div className="text-center">
                <p className="text-4xl font-bold text-primary-600">12,000+</p>
                <p className="mt-2 text-sm text-gray-600">Ore economisite</p>
              </div>
              <div className="text-center">
                <p className="text-4xl font-bold text-primary-600">4.8/5</p>
                <p className="mt-2 text-sm text-gray-600">Rating mediu</p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <FAQ />

        {/* Final CTA Section */}
        <section className="py-20 bg-primary-600">
          <div className="mx-auto max-w-4xl px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Gata să scapi de Excel?
            </h2>
            <p className="mt-4 text-lg text-primary-100">
              Încearcă BlocApp gratuit 90 de zile. Fără card, fără obligații. Anulezi oricând.
            </p>
            <div className="mt-10">
              <a
                href="https://app.blocapp.ro?register=true"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold rounded-lg bg-white text-primary-600 hover:bg-primary-50 hover:text-primary-700 transition-all shadow-lg hover:shadow-xl"
              >
                Creează Cont Gratuit
              </a>
            </div>
            <p className="mt-6 text-sm text-primary-200">
              Ai nevoie de ajutor?{' '}
              <a href="/contact" className="underline hover:text-white">
                Contactează-ne
              </a>
              {' '}sau{' '}
              <a href="mailto:contact@blocapp.ro" className="underline hover:text-white">
                Programează demo live
              </a>
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

// Data for Features
const features = [
  {
    icon: '🏢',
    title: 'Gestionare Structură Completă',
    description: 'Organizează asociația în blocuri, scări și apartamente. Adaugă proprietari cu date complete, definește cote parte și număr persoane.',
  },
  {
    icon: '💰',
    title: 'Calculare Automată Întreținere',
    description: 'Adaugi cheltuielile lunare și BlocApp calculează automat repartizarea pe fiecare apartament. Zero formule Excel, zero greșeli.',
  },
  {
    icon: '📄',
    title: 'Gestiune Facturi și Furnizori',
    description: 'Încarcă facturi (PDF/imagine), asociază furnizori, distribuie sume pe multiple tipuri de cheltuieli. Totul organizat și ușor de găsit.',
  },
  {
    icon: '💳',
    title: 'Înregistrare Plăți și Chitanțe',
    description: 'Înregistrezi plățile proprietarilor, generezi chitanțe automat cu număr unic, track-uiești sold per apartament. Plus plăți online cu cardul.',
  },
  {
    icon: '📊',
    title: 'Rapoarte și Export PDF',
    description: 'Generezi lista de întreținere pentru avizier în 30 secunde. Export Excel pentru contabil. Rapoarte lunare pentru adunarea generală.',
  },
  {
    icon: '🔐',
    title: 'Portal pentru Proprietari',
    description: 'Fiecare proprietar își poate vedea soldul, istoricul plăților, detalii cheltuieli și poate descărca chitanțe. Transparență totală.',
  },
];

// Data for Comparison Table
const comparisonData = [
  { criterion: 'Timp necesar lunar', excel: '3-4 ore', blocapp: '30 minute' },
  { criterion: 'Risc erori de calcul', excel: 'Mare', blocapp: 'Zero' },
  { criterion: 'Istoricizare', excel: 'Manual', blocapp: 'Automat' },
  { criterion: 'Acces proprietari', excel: 'Email PDF', blocapp: 'Portal 24/7' },
  { criterion: 'Plăți online', excel: 'Nu', blocapp: 'Da' },
  { criterion: 'Backup automat', excel: 'Nu', blocapp: 'Da (zilnic)' },
  { criterion: 'Mobile', excel: 'Dificil', blocapp: 'Perfect' },
  { criterion: 'Cost', excel: 'Gratuit', blocapp: 'De la 149 lei/lună' },
];

// Data for Testimonials
const testimonials = [
  {
    quote: 'Am trecut de la 4 ore pe lună petrecute în Excel la 30 de minute în BlocApp. Calculele sunt automate și corecte, iar proprietarii apreciază transparența.',
    author: 'Maria Ionescu',
    role: 'Administrator',
    association: 'Asociația Vulturilor 23, București',
    details: '127 apartamente',
  },
  {
    quote: 'Cel mai mult îmi place că pot vedea exact cum se distribuie fiecare factură. Nu mai primesc întrebări suspicioase de la proprietari. Totul este transparent.',
    author: 'Ion Popescu',
    role: 'Președinte',
    association: 'Complexul Nordului, Cluj-Napoca',
    details: '89 apartamente',
  },
  {
    quote: 'Implementarea a fost surprinzător de simplă. În 2 ore am introdus toate datele și am generat prima listă. Suportul tehnic răspunde prompt. Recomand!',
    author: 'Elena Dumitrescu',
    role: 'Administrator',
    association: 'Ansamblul Teilor, Timișoara',
    details: '156 apartamente',
  },
];
