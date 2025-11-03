import type { Metadata } from 'next';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { getAllPosts, getAllCategories } from '@/lib/blog';
import BlogClient from './BlogClient';

export const metadata: Metadata = {
  title: 'Blog BlocApp | Ghiduri și Resurse Administrare Bloc',
  description: 'Articole, ghiduri și resurse pentru administratori de bloc din România. Învață cum să îți optimizezi munca și să gestionezi mai bine asociația.',
};

export default function BlogPage() {
  // Fetch blog posts and categories from Markdown files (Server Component)
  const allPosts = getAllPosts();
  const categories = getAllCategories();

  return (
    <>
      <Header />
      <BlogClient allPosts={allPosts} categories={categories} />
      <Footer />
    </>
  );
}
