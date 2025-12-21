import type { Metadata } from 'next';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Button from '@/components/ui/Button';

export const metadata: Metadata = {
  title: 'Prețuri BlocApp | De la 3.99 lei/apartament/lună',
  description: 'Prețuri simple și transparente: Starter 149 lei/lună (30 apt), Professional 3.99 lei/apt, Enterprise 2.99 lei/apt. Trial 30 zile gratuit, fără card.',
};

const pricingPlans = [
  {
    name: 'Starter',
    badge: 'Ideal pentru începători',
    price: '149',
    unit: 'lună',
    description: 'Până la 30 apartamente',
    features: [
      { text: '1 asociație', included: true },
      { text: 'Blocuri, scări, apartamente nelimitate', included: true },
      { text: 'Toate tipurile de cheltuieli', included: true },
      { text: 'Calcul automat întreținere', included: true },
      { text: 'Facturi și furnizori', included: true },
      { text: 'Încasări și chitanțe', included: true },
      { text: 'Export PDF și Excel', included: true },
      { text: 'Istoric arhivat complet', included: true },
      { text: 'Suport email', included: true },
      { text: 'Portal proprietari', included: false },
      { text: 'Plăți online', included: false },
    ],
    cta: 'Începe Trial Gratuit',
    href: '/trial',
    popular: false,
  },
  {
    name: 'Professional',
    badge: 'Cel mai popular',
    price: '3.99',
    unit: 'apartament/lună',
    description: '30-200 apartamente',
    example: '50 apartamente = 200 lei/lună',
    features: [
      { text: 'Tot din Starter +', included: true },
      { text: 'Portal pentru proprietari (acces 24/7)', included: true, highlight: true },
      { text: 'Plăți online cu cardul (Stripe)', included: true, highlight: true },
      { text: 'Notificări email automate', included: true, highlight: true },
      { text: 'Trimitere indexuri online', included: true },
      { text: 'Multi-admin (mai mulți utilizatori)', included: true },
      { text: 'Custom branding PDF (logo asociație)', included: true },
      { text: 'Rapoarte avansate', included: true },
      { text: 'Suport prioritar email', included: true },
      { text: 'Onboarding ghidat', included: true },
    ],
    cta: 'Începe Trial Gratuit',
    href: '/trial',
    popular: true,
  },
  {
    name: 'Enterprise',
    badge: 'Pentru asociații mari',
    price: '2.99',
    unit: 'apartament/lună',
    description: '200+ apartamente',
    example: '200 apartamente = 598 lei/lună',
    features: [
      { text: 'Tot din Professional +', included: true },
      { text: 'Reducere 25% per apartament', included: true, highlight: true },
      { text: 'Onboarding personalizat inclus', included: true, highlight: true },
      { text: 'Suport telefonic dedicat', included: true, highlight: true },
      { text: 'Account manager dedicat', included: true },
      { text: 'Training live pentru echipă', included: true },
      { text: 'Migrare date asistată', included: true },
      { text: 'Customizări pe request', included: true },
      { text: 'SLA garantat (99.9% uptime)', included: true },
      { text: 'Facturare anuală (discount 10%)', included: true },
    ],
    cta: 'Contactează-ne pentru Ofertă',
    href: '/contact',
    popular: false,
  },
];

const faqPricing = [
  {
    q: 'Este trial-ul cu adevărat gratuit?',
    a: 'Da, 100%. Nu solicităm card, nu facturăm nimic. După 30 zile, alegi un plan sau anulezi fără penalități.',
  },
  {
    q: 'Pot schimba planul după ce mă abonez?',
    a: 'Da, oricând. Upgrade instant (plătești diferența pro-rata). Downgrade la următoarea facturare.',
  },
  {
    q: 'Ce se întâmplă dacă numărul de apartamente se modifică?',
    a: 'Pentru planurile Professional și Enterprise (per apartament), costul se ajustează automat lunar la numărul real de apartamente active.',
  },
  {
    q: 'Acceptați facturi și plată cu OP?',
    a: 'Da, emitem facturi fiscale cu TVA. Acceptăm plata cu card online, transfer bancar sau OP (pentru facturi >500 lei).',
  },
];

export default function PreturiPage() {
  return (
    <>
      <Header />

      <main>
        {/* Hero Section */}
        <section className="bg-gradient-to-b from-primary-50 to-white py-20">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                Prețuri simple și transparente
              </h1>
              <p className="mt-6 text-lg text-gray-600 max-w-2xl mx-auto">
                Plătești doar pentru apartamentele pe care le administrezi. Fără costuri ascunse, fără surprize.
              </p>
            </div>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="py-16 bg-white">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="grid md:grid-cols-3 gap-8">
              {pricingPlans.map((plan, index) => (
                <div
                  key={index}
                  className={`rounded-2xl border-2 p-8 flex flex-col ${
                    plan.popular
                      ? 'border-primary-600 shadow-xl relative'
                      : 'border-gray-200'
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <span className="bg-primary-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                        {plan.badge}
                      </span>
                    </div>
                  )}
                  {!plan.popular && (
                    <div className="text-sm font-semibold text-gray-600 mb-4">
                      {plan.badge}
                    </div>
                  )}

                  <div className="mb-6">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">
                      {plan.name}
                    </h3>
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-4xl font-bold text-primary-600">
                        {plan.price}
                      </span>
                      <span className="text-gray-600">lei/{plan.unit}</span>
                    </div>
                    <p className="text-sm text-gray-600">{plan.description}</p>
                    {plan.example && (
                      <p className="text-xs text-gray-500 mt-1">{plan.example}</p>
                    )}
                  </div>

                  <ul className="space-y-3 mb-8 flex-1">
                    {plan.features.map((feature, featureIndex) => (
                      <li
                        key={featureIndex}
                        className={`flex items-start gap-3 ${
                          'highlight' in feature && feature.highlight ? 'font-semibold' : ''
                        }`}
                      >
                        {feature.included ? (
                          <svg
                            className="h-5 w-5 text-secondary-600 flex-shrink-0 mt-0.5"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                        <span
                          className={
                            feature.included ? 'text-gray-900' : 'text-gray-500'
                          }
                        >
                          {feature.text}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    href={plan.href}
                    variant={plan.popular ? 'primary' : 'outline'}
                    size="lg"
                    className="w-full"
                  >
                    {plan.cta}
                  </Button>
                </div>
              ))}
            </div>

            {/* Trust Signals */}
            <div className="mt-12 grid md:grid-cols-4 gap-6 text-center">
              <div className="p-4">
                <p className="text-sm font-semibold text-gray-900">
                  ✓ Fără contract pe termen lung
                </p>
              </div>
              <div className="p-4">
                <p className="text-sm font-semibold text-gray-900">
                  ✓ Anulare oricând
                </p>
              </div>
              <div className="p-4">
                <p className="text-sm font-semibold text-gray-900">
                  ✓ Primele 30 zile gratuit
                </p>
              </div>
              <div className="p-4">
                <p className="text-sm font-semibold text-gray-900">
                  ✓ Suport inclus
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Pricing */}
        <section className="py-16 bg-gray-50">
          <div className="mx-auto max-w-3xl px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">
              Întrebări despre Prețuri
            </h2>

            <div className="space-y-6">
              {faqPricing.map((item, index) => (
                <div
                  key={index}
                  className="bg-white p-6 rounded-lg border border-gray-200"
                >
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {item.q}
                  </h3>
                  <p className="text-gray-700">{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-primary-600">
          <div className="mx-auto max-w-3xl px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Gata să începi?
            </h2>
            <p className="text-xl text-primary-100 mb-8">
              Încearcă gratuit 30 de zile. Fără card, fără obligații.
            </p>
            <a
              href="/trial"
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold rounded-lg bg-white text-primary-600 hover:bg-primary-50 hover:text-primary-700 transition-all shadow-lg hover:shadow-xl"
            >
              Creează Cont Gratuit
            </a>
            <p className="mt-6 text-sm text-primary-200">
              Ai întrebări?{' '}
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
