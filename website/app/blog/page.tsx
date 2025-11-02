import type { Metadata } from 'next';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Blog BlocApp | Ghiduri și Resurse Administrare Bloc',
  description: 'Articole, ghiduri și resurse pentru administratori de bloc din România. Învață cum să îți optimizezi munca și să gestionezi mai bine asociația.',
};

// Articole de blog (în viitor vor veni din CMS sau Markdown)
const blogPosts = [
  {
    id: 1,
    title: 'Cum să Treci de la Excel la Software Profesionist în 2025',
    excerpt: 'Ghid complet pentru administratorii care vor să digitalizeze procesul de calculare a întreținerii. Pas cu pas, fără stres.',
    category: 'Ghiduri',
    date: '2025-01-15',
    readTime: '8 min',
    image: '/blog-placeholder-1.jpg',
    slug: 'excel-la-software-profesionist',
    author: 'Echipa BlocApp',
  },
  {
    id: 2,
    title: 'Top 5 Greșeli Făcute în Excel la Calculul Întreținerii',
    excerpt: 'Erorile cele mai comune pe care le-am văzut în tabele Excel și cum le poți evita. Experiența din zeci de asociații.',
    category: 'Best Practices',
    date: '2025-01-10',
    readTime: '6 min',
    image: '/blog-placeholder-2.jpg',
    slug: 'greseli-excel-intretinere',
    author: 'Echipa BlocApp',
  },
  {
    id: 3,
    title: 'Legislație: Ce Sunt Obligat să Afișez ca Administrator',
    excerpt: 'Obligațiile legale ale administratorului de asociație în 2025. Lista completă cu documente și termene.',
    category: 'Legal',
    date: '2025-01-05',
    readTime: '10 min',
    image: '/blog-placeholder-3.jpg',
    slug: 'legislatie-obligatii-administrator',
    author: 'Echipa BlocApp',
  },
  {
    id: 4,
    title: 'Calcularea Cotei Părți Indivize - Exemplu Practic',
    excerpt: 'Cum se calculează și se folosește cota parte indiviza pentru repartizarea cheltuielilor comune. Exemple concrete.',
    category: 'Ghiduri',
    date: '2024-12-28',
    readTime: '7 min',
    image: '/blog-placeholder-4.jpg',
    slug: 'calculare-cota-parte-indiviza',
    author: 'Echipa BlocApp',
  },
  {
    id: 5,
    title: 'Cum să Gestionezi Penalitățile de Întârziere Corect',
    excerpt: 'Metodologia legală de calcul a penalităților, cum le comunici proprietarilor și cum le înregistrezi în evidențe.',
    category: 'Best Practices',
    date: '2024-12-20',
    readTime: '5 min',
    image: '/blog-placeholder-5.jpg',
    slug: 'gestionare-penalitati-intarziere',
    author: 'Echipa BlocApp',
  },
  {
    id: 6,
    title: 'Checklist: Pregătirea Adunării Generale a Proprietarilor',
    excerpt: 'Tot ce trebuie să pregătești înainte de AG: documente, procese verbale, rapoarte financiare. Lista completă.',
    category: 'Ghiduri',
    date: '2024-12-15',
    readTime: '9 min',
    image: '/blog-placeholder-6.jpg',
    slug: 'checklist-adunare-generala',
    author: 'Echipa BlocApp',
  },
];

const categories = ['Toate', 'Ghiduri', 'Best Practices', 'Legal', 'Case Studies', 'Update Produs'];

export default function BlogPage() {
  return (
    <>
      <Header />

      <main>
        {/* Hero Section */}
        <section className="bg-gradient-to-b from-primary-50 to-white py-20">
          <div className="mx-auto max-w-4xl px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                Blog BlocApp
              </h1>
              <p className="mt-6 text-lg text-gray-600">
                Resurse, ghiduri și best practices pentru administratori moderni de asociații de proprietari
              </p>
            </div>
          </div>
        </section>

        {/* Category Filter */}
        <section className="py-8 bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="flex flex-wrap gap-3 justify-center">
              {categories.map((category) => (
                <button
                  key={category}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    category === 'Toate'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Blog Posts Grid */}
        <section className="py-16 bg-white">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {blogPosts.map((post) => (
                <article
                  key={post.id}
                  className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
                >
                  {/* Image Placeholder */}
                  <div className="aspect-video bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center">
                    <div className="text-center px-6">
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-lg shadow-md mb-3">
                        <span className="text-2xl font-bold text-primary-600">B</span>
                      </div>
                      <p className="text-sm text-primary-700">Imagine articol</p>
                    </div>
                  </div>

                  <div className="p-6">
                    {/* Category & Meta */}
                    <div className="flex items-center gap-4 mb-3">
                      <span className="px-3 py-1 bg-primary-100 text-primary-700 text-xs font-semibold rounded-full">
                        {post.category}
                      </span>
                      <span className="text-sm text-gray-500">{post.readTime} citire</span>
                    </div>

                    {/* Title */}
                    <h2 className="text-xl font-bold text-gray-900 mb-3 hover:text-primary-600 transition-colors">
                      <Link href={`/blog/${post.slug}`}>
                        {post.title}
                      </Link>
                    </h2>

                    {/* Excerpt */}
                    <p className="text-gray-600 mb-4 line-clamp-3">
                      {post.excerpt}
                    </p>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <span className="text-sm text-gray-500">
                        {new Date(post.date).toLocaleDateString('ro-RO', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </span>
                      <Link
                        href={`/blog/${post.slug}`}
                        className="text-sm font-semibold text-primary-600 hover:text-primary-700"
                      >
                        Citește →
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {/* Pagination Placeholder */}
            <div className="mt-12 flex justify-center gap-2">
              <button className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium">
                1
              </button>
              <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200">
                2
              </button>
              <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200">
                3
              </button>
              <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200">
                →
              </button>
            </div>
          </div>
        </section>

        {/* Newsletter Section */}
        <section className="py-16 bg-gray-50">
          <div className="mx-auto max-w-3xl px-6 lg:px-8">
            <div className="bg-white rounded-2xl shadow-lg p-8 lg:p-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-6">
                <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Abonează-te la Newsletter
              </h2>
              <p className="text-gray-600 mb-8">
                Primești lunar ghiduri, resurse și tips & tricks pentru administrarea eficientă. Zero spam.
              </p>
              <form className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                <input
                  type="email"
                  placeholder="Email-ul tău"
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <button
                  type="submit"
                  className="px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors whitespace-nowrap"
                >
                  Abonează-te
                </button>
              </form>
              <p className="text-xs text-gray-500 mt-4">
                Conform GDPR. Poți anula abonamentul oricând.
              </p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-primary-600">
          <div className="mx-auto max-w-3xl px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Aplică tot ce ai învățat cu BlocApp
            </h2>
            <p className="text-xl text-primary-100 mb-8">
              Software-ul care pune în practică toate best practices-urile despre care citești aici.
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
