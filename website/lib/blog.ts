import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { remark } from 'remark';
import html from 'remark-html';

const postsDirectory = path.join(process.cwd(), 'content/blog');

export interface BlogPost {
  slug: string;
  title: string;
  date: string;
  category: string;
  excerpt: string;
  author: string;
  image: string;
  readTime: string;
  keywords?: string[];
  content?: string;
}

/**
 * Get all blog posts sorted by date (newest first)
 */
export function getAllPosts(): BlogPost[] {
  // Check if directory exists
  if (!fs.existsSync(postsDirectory)) {
    return [];
  }

  const fileNames = fs.readdirSync(postsDirectory);
  const allPostsData = fileNames
    .filter(fileName => fileName.endsWith('.md') && !fileName.startsWith('_'))
    .map(fileName => {
      const slug = fileName.replace(/\.md$/, '');
      const fullPath = path.join(postsDirectory, fileName);
      const fileContents = fs.readFileSync(fullPath, 'utf8');
      const { data } = matter(fileContents);

      return {
        slug,
        ...(data as Omit<BlogPost, 'slug'>),
      };
    });

  // Sort posts by date descending
  return allPostsData.sort((a, b) => (a.date < b.date ? 1 : -1));
}

/**
 * Get a single blog post by slug with rendered HTML content
 */
export async function getPostBySlug(slug: string): Promise<BlogPost> {
  const fullPath = path.join(postsDirectory, `${slug}.md`);
  const fileContents = fs.readFileSync(fullPath, 'utf8');
  const { data, content } = matter(fileContents);

  // Convert markdown to HTML
  const processedContent = await remark()
    .use(html, { sanitize: false })
    .process(content);
  const contentHtml = processedContent.toString();

  return {
    slug,
    content: contentHtml,
    ...(data as Omit<BlogPost, 'slug' | 'content'>),
  };
}

/**
 * Get posts filtered by category
 */
export function getPostsByCategory(category: string): BlogPost[] {
  const allPosts = getAllPosts();
  if (category === 'Toate' || !category) return allPosts;
  return allPosts.filter(post => post.category === category);
}

/**
 * Get all unique categories from posts
 */
export function getAllCategories(): string[] {
  const allPosts = getAllPosts();
  const categories = allPosts.map(post => post.category);
  return ['Toate', ...Array.from(new Set(categories))];
}

/**
 * Get related posts based on category (excluding current post)
 */
export function getRelatedPosts(slug: string, category: string, limit: number = 3): BlogPost[] {
  const allPosts = getAllPosts();
  return allPosts
    .filter(post => post.slug !== slug && post.category === category)
    .slice(0, limit);
}
