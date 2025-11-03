import type { Metadata } from 'next';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { getPostBySlug, getAllPosts, getRelatedPosts } from '@/lib/blog';
import Link from 'next/link';
import { ArrowLeft, Calendar, Clock, User, Tag } from 'lucide-react';

// Generate static params for all blog posts
export async function generateStaticParams() {
  const posts = getAllPosts();
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

// Generate metadata for SEO
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  return {
    title: `${post.title} | Blog BlocApp`,
    description: post.excerpt,
    keywords: post.keywords?.join(', '),
    authors: [{ name: post.author }],
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: 'article',
      publishedTime: post.date,
      authors: [post.author],
      images: [
        {
          url: post.image,
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
      images: [post.image],
    },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  const relatedPosts = getRelatedPosts(post.slug, post.category, 3);

  // Format date in Romanian
  const formattedDate = new Date(post.date).toLocaleDateString('ro-RO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <>
      <Header />

      <main className="min-h-screen bg-gray-50">
        {/* Article Header */}
        <section className="bg-gradient-to-b from-primary-50 via-white to-transparent py-12 lg:py-16">
          <div className="mx-auto max-w-4xl px-6 lg:px-8">
            {/* Back to Blog Link */}
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 transition-colors mb-8 group"
            >
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
              <span className="font-medium">Înapoi la Blog</span>
            </Link>

            {/* Category Badge */}
            <div className="mb-6">
              <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-primary-100 text-primary-700 text-sm font-semibold rounded-full">
                <Tag className="w-3.5 h-3.5" />
                {post.category}
              </span>
            </div>

            {/* Article Title */}
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl mb-6 leading-tight">
              {post.title}
            </h1>

            {/* Article Meta */}
            <div className="flex flex-wrap items-center gap-4 lg:gap-6 text-gray-600 text-sm lg:text-base">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-primary-600" />
                <span className="font-medium">{post.author}</span>
              </div>
              <span className="text-gray-300">•</span>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary-600" />
                <time dateTime={post.date}>{formattedDate}</time>
              </div>
              <span className="text-gray-300">•</span>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary-600" />
                <span>{post.readTime} citire</span>
              </div>
            </div>
          </div>
        </section>

        {/* Article Content */}
        <section className="py-12 lg:py-16">
          <div className="mx-auto max-w-4xl px-6 lg:px-8">
            {/* Featured Image (if exists and not placeholder) */}
            {post.image && !post.image.includes('placeholder') && (
              <div className="mb-12 rounded-2xl overflow-hidden shadow-lg">
                <img
                  src={post.image}
                  alt={post.title}
                  className="w-full h-auto"
                />
              </div>
            )}

            {/* Article Body */}
            <article
              className="prose prose-lg prose-gray max-w-none
                prose-headings:font-bold prose-headings:text-gray-900
                prose-h2:text-3xl prose-h2:mt-12 prose-h2:mb-6
                prose-h3:text-2xl prose-h3:mt-8 prose-h3:mb-4
                prose-p:text-gray-700 prose-p:leading-relaxed prose-p:mb-6
                prose-a:text-primary-600 prose-a:no-underline hover:prose-a:text-primary-700 hover:prose-a:underline
                prose-strong:text-gray-900 prose-strong:font-semibold
                prose-ul:my-6 prose-ul:list-disc prose-ul:pl-6
                prose-ol:my-6 prose-ol:list-decimal prose-ol:pl-6
                prose-li:text-gray-700 prose-li:my-2
                prose-blockquote:border-l-4 prose-blockquote:border-primary-500 prose-blockquote:pl-6 prose-blockquote:italic prose-blockquote:text-gray-700
                prose-code:text-primary-600 prose-code:bg-primary-50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
                prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-pre:p-6 prose-pre:rounded-lg prose-pre:overflow-x-auto
                prose-img:rounded-lg prose-img:shadow-md"
              dangerouslySetInnerHTML={{ __html: post.content || '' }}
            />

            {/* CTA Section */}
            <div className="mt-16 p-8 bg-gradient-to-br from-primary-50 to-primary-100 rounded-2xl border-2 border-primary-200">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Gata să digitalizezi administrarea asociației tale?
              </h3>
              <p className="text-gray-700 mb-6 leading-relaxed">
                BlocApp îți oferă toate instrumentele necesare pentru o administrare eficientă, transparentă și conformă cu legislația.
                Încearcă gratuit și vezi diferența!
              </p>
              <Link
                href="/#incearca"
                className="inline-block px-8 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors shadow-md hover:shadow-lg"
              >
                Încearcă BlocApp Gratuit
              </Link>
            </div>

            {/* Keywords/Tags Section */}
            {post.keywords && post.keywords.length > 0 && (
              <div className="mt-12 pt-8 border-t border-gray-200">
                <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
                  Cuvinte cheie
                </h4>
                <div className="flex flex-wrap gap-2">
                  {post.keywords.map((keyword, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Related Articles */}
        {relatedPosts.length > 0 && (
          <section className="py-16 bg-white border-t border-gray-200">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-8">
                Articole similare
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {relatedPosts.map((relatedPost) => (
                  <Link
                    key={relatedPost.slug}
                    href={`/blog/${relatedPost.slug}`}
                    className="group"
                  >
                    <article className="bg-gray-50 rounded-xl overflow-hidden border border-gray-200 hover:border-primary-300 hover:shadow-lg transition-all">
                      <div className="aspect-video bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center">
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
                          <span className="text-2xl font-bold text-primary-600">B</span>
                        </div>
                      </div>
                      <div className="p-6">
                        <div className="mb-3">
                          <span className="text-xs font-semibold text-primary-600 uppercase tracking-wide">
                            {relatedPost.category}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-primary-600 transition-colors line-clamp-2">
                          {relatedPost.title}
                        </h3>
                        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                          {relatedPost.excerpt}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span>{relatedPost.readTime} citire</span>
                          <span>•</span>
                          <span>{new Date(relatedPost.date).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' })}</span>
                        </div>
                      </div>
                    </article>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </>
  );
}
