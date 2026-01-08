'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Button from '../ui/Button';

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const navigation = [
    { name: 'Funcționalități', href: '/functionalitati' },
    { name: 'Prețuri', href: '/preturi' },
    { name: 'Demo', href: '/demo' },
    { name: 'Blog', href: '/blog' },
    { name: 'Despre', href: '/despre' },
    { name: 'Contact', href: '/contact' },
  ];

  const isActive = (href: string) => pathname === href;

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <nav className="mx-auto max-w-7xl px-6 lg:px-8" aria-label="Top">
        <div className="flex items-center justify-between py-4">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-3">
              <img
                src="/blocapp-icon-admin.png"
                alt="BlocApp"
                className="h-10 w-10 object-contain"
              />
              <span className="text-3xl font-bold text-gray-900 font-montserrat self-end pb-1">BlocApp</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex lg:items-center lg:space-x-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`text-base font-medium transition-colors ${
                  isActive(item.href)
                    ? 'text-primary-600 font-semibold'
                    : 'text-gray-700 hover:text-primary-600'
                }`}
              >
                {item.name}
              </Link>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="hidden lg:flex lg:items-center lg:space-x-3">
            <a
              href="https://portal.blocapp.ro"
              className="text-sm font-medium text-gray-600 hover:text-primary-600 transition-colors"
            >
              Proprietari
            </a>
            <a
              href="https://app.blocapp.ro"
              className="text-sm font-medium text-gray-700 hover:text-primary-600 px-3 py-2 border border-gray-300 rounded-lg hover:border-primary-300 transition-colors"
            >
              Administratori
            </a>
          </div>

          {/* Mobile menu button */}
          <div className="lg:hidden">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md p-2 text-gray-700 hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <span className="sr-only">Deschide meniu</span>
              {mobileMenuOpen ? (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-4 border-t border-gray-200">
            <div className="space-y-2">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`block px-3 py-2 text-base font-medium rounded-md transition-colors ${
                    isActive(item.href)
                      ? 'text-primary-600 bg-primary-50 font-semibold'
                      : 'text-gray-700 hover:text-primary-600 hover:bg-gray-50'
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
              <div className="pt-4 space-y-2">
                <a
                  href="https://portal.blocapp.ro"
                  className="block w-full text-center px-4 py-2 text-sm font-medium text-gray-600 hover:text-primary-600 border border-gray-200 rounded-lg"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Proprietari
                </a>
                <a
                  href="https://app.blocapp.ro"
                  className="block w-full text-center px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:border-primary-300"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Administratori
                </a>
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
