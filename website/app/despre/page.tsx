import type { Metadata } from 'next';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'Despre BlocApp - Povestea Noastră | De la Excel la Software Modern',
  description: 'Am creat BlocApp din necesitate personală, după ani de tabele Excel pentru tatăl meu, administrator de bloc. Experiență din banking aplicată la condominii.',
};

export default function DesprePage() {
  return (
    <>
      <Header />

      <main>
        {/* Hero Section */}
        <section className="bg-gradient-to-b from-primary-50 to-white py-10 sm:py-16 lg:py-20">
          <div className="mx-auto max-w-4xl px-6 lg:px-8">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl text-center">
              Povestea BlocApp
            </h1>
            <p className="mt-6 text-xl text-gray-600 text-center">
              De la Excel la Software Modern
            </p>
          </div>
        </section>

        {/* Main Story Section */}
        <section className="py-16 bg-white">
          <div className="mx-auto max-w-4xl px-6 lg:px-8">
            <div className="prose prose-lg max-w-none">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                Am transformat o problemă personală într-o soluție pentru mii de administratori
              </h2>

              <p className="text-lg text-gray-700 leading-relaxed mb-6">
                Am început dezvoltarea BlocApp din necesitate, nu din ambiție antreprenorială.
              </p>

              <p className="text-lg text-gray-700 leading-relaxed mb-6">
                Tatăl meu este administrator de asociație de proprietari de peste 10 ani. Lunar, îi întocmeam tabelul de întreținere în Excel - un proces anevoios, predispus la erori și consumator de timp. Fiecare lună însemna ore întregi de formule copiate, verificări duble și truble, și întotdeauna riscul unei greșeli de calcul care putea genera nemulțumiri în asociație.
              </p>

              <p className="text-lg text-gray-700 leading-relaxed mb-6">
                După ani de optimizare a proceselor în sistemul bancar românesc, unde am implementat soluții digitale care au îmbunătățit experiența pentru milioane de utilizatori, am decis să aplic aceeași expertiză în domeniul administrării condominiilor.
              </p>

              <div className="bg-primary-50 border-l-4 border-primary-600 p-6 my-8">
                <p className="text-lg font-semibold text-primary-900 italic">
                  "Am văzut cum tehnologia poate transforma procese complexe în fluxuri simple și intuitive. De ce să nu fac același lucru pentru administratorii de bloc?"
                </p>
              </div>

              <p className="text-lg text-gray-700 leading-relaxed mb-6">
                În banking, am automatizat procese care luau zile, reducându-le la minute. Am eliminat erori umane prin validări inteligente. Am făcut transparente operațiuni care înainte erau opace.
              </p>

              <p className="text-lg text-gray-700 leading-relaxed mb-6">
                Rezultatul este BlocApp - o platformă intuitivă care:
              </p>

              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-3">
                  <svg className="h-6 w-6 text-secondary-600 flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-lg text-gray-700">Automatizează calculele complexe de repartizare cheltuieli</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="h-6 w-6 text-secondary-600 flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-lg text-gray-700">Reduce timpul de lucru de la 4 ore la 30 de minute</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="h-6 w-6 text-secondary-600 flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-lg text-gray-700">Elimină erorile de calcul prin matematica automată</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="h-6 w-6 text-secondary-600 flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-lg text-gray-700">Oferă transparență completă pentru proprietari prin portal dedicat</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="h-6 w-6 text-secondary-600 flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-lg text-gray-700">Păstrează istoric complet pentru audit și referințe</span>
                </li>
              </ul>

              <div className="bg-gray-50 p-6 rounded-lg mb-8">
                <p className="text-lg font-semibold text-gray-900 mb-2">
                  Nu este doar despre software.
                </p>
                <p className="text-lg text-gray-700">
                  Este despre respectul pentru timpul administratorilor și liniștea lor că totul este corect.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Timeline Section */}
        <section className="py-16 bg-gray-50">
          <div className="mx-auto max-w-4xl px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">
              Călătoria BlocApp
            </h2>

            <div className="space-y-12">
              {/* 2015 - Problema */}
              <div className="flex gap-6">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center w-16 h-16 bg-red-100 text-red-600 rounded-full font-bold text-xl">
                    2015
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Problema</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li>• Tatăl meu devine administrator de bloc</li>
                    <li>• Încep să-i fac lunar tabelul de întreținere în Excel</li>
                    <li>• Realizez cât de ineficient și stresant este procesul</li>
                  </ul>
                </div>
              </div>

              {/* 2016-2024 - Experiență */}
              <div className="flex gap-6">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center w-16 h-16 bg-blue-100 text-blue-600 rounded-full font-bold text-sm text-center leading-tight py-2">
                    2016<br/>2024
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Experiență</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li>• Lucrez în optimizare procese bancare</li>
                    <li>• Implementez soluții digitale pentru operațiuni complexe</li>
                    <li>• Învăț cum tehnologia poate simplifica munca zilnică</li>
                  </ul>
                </div>
              </div>

              {/* 2024 - Soluția */}
              <div className="flex gap-6">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center w-16 h-16 bg-accent-100 text-accent-600 rounded-full font-bold text-xl">
                    2024
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Soluția</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li>• Încep dezvoltarea BlocApp</li>
                    <li>• Aplic lecțiile din banking la administrarea condominiilor</li>
                    <li>• Testez cu tatăl meu și primii beta utilizatori</li>
                  </ul>
                </div>
              </div>

              {/* 2025 - Lansare */}
              <div className="flex gap-6">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center w-16 h-16 bg-secondary-100 text-secondary-600 rounded-full font-bold text-xl">
                    2025
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Lansare</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li>• BlocApp devine disponibil pentru toți administratorii din România</li>
                    <li>• Misiune: Să digitalizăm administrarea a 100,000 de apartamente în 3 ani</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Mission & Vision */}
        <section className="py-16 bg-white">
          <div className="mx-auto max-w-4xl px-6 lg:px-8">
            <div className="grid md:grid-cols-2 gap-12">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Misiunea noastră</h2>
                <p className="text-lg text-gray-700">
                  Să facem administrarea asociațiilor de proprietari accesibilă, transparentă și eficientă prin tehnologie modernă.
                </p>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Viziunea noastră</h2>
                <p className="text-lg text-gray-700">
                  O Românie în care fiecare administrator are instrumentele digitale necesare pentru a-și face treaba excelent, iar fiecare proprietar are transparență completă asupra cheltuielilor sale.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="py-16 bg-gray-50">
          <div className="mx-auto max-w-4xl px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">
              Valorile Noastre
            </h2>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-white p-8 rounded-xl border border-gray-200">
                <div className="text-4xl mb-4">🔍</div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Transparență</h3>
                <p className="text-gray-700">
                  Fiecare calcul este explicat. Fiecare proprietar poate vedea exact cum s-a ajuns la suma lui.
                </p>
              </div>

              <div className="bg-white p-8 rounded-xl border border-gray-200">
                <div className="text-4xl mb-4">⚡</div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Simplitate</h3>
                <p className="text-gray-700">
                  Software-ul bun nu ar trebui să necesite training de zile întregi. BlocApp se învață în 2 ore.
                </p>
              </div>

              <div className="bg-white p-8 rounded-xl border border-gray-200">
                <div className="text-4xl mb-4">🚀</div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Inovație</h3>
                <p className="text-gray-700">
                  Aplicăm tehnologii moderne (React, Firebase, AI) pentru a rezolva probleme vechi.
                </p>
              </div>

              <div className="bg-white p-8 rounded-xl border border-gray-200">
                <div className="text-4xl mb-4">❤️</div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Empatie</h3>
                <p className="text-gray-700">
                  Înțelegem frustrările administratorilor pentru că am trăit experiența personal.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 bg-primary-600">
          <div className="mx-auto max-w-3xl px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Vrei să faci parte din povestea BlocApp?
            </h2>
            <p className="text-xl text-primary-100 mb-8">
              Încearcă gratuit 90 de zile și vezi diferența.
            </p>
            <a
              href="https://app.blocapp.ro?register=true"
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold rounded-lg bg-white text-primary-600 hover:bg-primary-50 hover:text-primary-700 transition-all shadow-lg hover:shadow-xl"
            >
              Începe Trial Gratuit
            </a>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
