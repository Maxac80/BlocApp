import type { Metadata } from 'next';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Link from 'next/link';
import { getAllPosts, getAllCategories } from '@/lib/blog';

export const metadata: Metadata = {
  title: 'Blog BlocApp | Ghiduri și Resurse Administrare Bloc',
  description: 'Articole, ghiduri și resurse pentru administratori de bloc din România. Învață cum să îți optimizezi munca și să gestionezi mai bine asociația.',
};

export default function BlogPage() {
  // Fetch blog posts and categories from Markdown files
  const blogPosts = getAllPosts();
  const categories = getAllCategories();
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
                  key={post.slug}
                  className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
                >
                  {/* Featured Image */}
                  <div className="aspect-video overflow-hidden relative">
                    <img
                      src={post.image}
                      alt={post.title}
                      className="w-full h-full object-cover transition-transform hover:scale-105"
                    />
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
