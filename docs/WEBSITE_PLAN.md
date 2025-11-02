# Website Marketing BlocApp - Plan Detaliat

**Data:** 2 Noiembrie 2025
**Timeline:** 2-3 săptămâni (Săptămâna 3-4 din LAUNCH_PLAN)
**Tehnologie:** Next.js 14 + Tailwind CSS + Vercel
**Domeniu:** blocapp.ro

---

## Decizie Tehnologie: De Ce Next.js?

### Comparație Opțiuni

| Criteriu | WordPress | Webflow/Wix | **Next.js** ✅ |
|----------|-----------|-------------|----------------|
| **SEO** | 🟡 Bun (plugin-uri) | 🟡 Bun (limitat) | ✅ **Excelent** (SSR native) |
| **Securitate** | ❌ Vulnerabilități frecvente | 🟡 Managed | ✅ **Super sigur** (static) |
| **Viteză** | 🟡 Medie (optimizări) | ✅ Bună | ✅ **Excelentă** (95+ PageSpeed) |
| **Cost hosting** | 50-100 lei/lună | 200 lei/lună | ✅ **0 lei** (Vercel free) |
| **Administrare** | 🟡 Updates continue | ✅ Foarte ușoară | 🟡 Tehnică (dar simplificăm) |
| **Customizare** | 🟡 Limitată de teme | ❌ Foarte limitată | ✅ **100% control** |
| **Integrare Firebase** | 🟡 Posibilă (plugins) | ❌ Dificilă | ✅ **Nativă** (React) |
| **Performance** | 🟡 60-80 PageSpeed | 🟡 70-85 PageSpeed | ✅ **95+ PageSpeed** |
| **Scalabilitate** | 🟡 Limitată | ❌ Vendor lock-in | ✅ **Infinită** |

### De Ce Next.js Este Alegerea Câștigătoare

**Pentru Business:**
- ✅ **Cost 0** hosting pe Vercel (economie 1,200-2,400 lei/an)
- ✅ **SEO excelent** → mai mult trafic organic → CAC mai mic
- ✅ **Siguranță maximă** → site static, fără baze de date vulnerabile
- ✅ **Performanță** → Google favorizează site-uri rapide în ranking

**Pentru Development:**
- ✅ **React** → Aceeași tehnologie ca aplicația (code reuse)
- ✅ **Tailwind** → Același design system ca app (consistență vizuală)
- ✅ **TypeScript ready** → Când vrei să migrezi
- ✅ **Hot reload** → Dezvoltare rapidă

**Pentru Tine (Administrare):**
- ✅ **Blog Markdown** → Editezi fișiere `.md` simple
- ✅ **Auto-deploy** → Git push → live în 3 minute
- ✅ **Preview branches** → Vezi modificări înainte de publish
- ✅ **Zero maintenance** → Fără updates WordPress, fără securitate worries

---

## Structura Site-ului

### Pagini Publice (SEO-friendly URLs)

1. **Homepage** → `/`
   - Hero section cu CTA principal
   - Features overview (3-5 feature cards)
   - Benefits section (de ce BlocApp vs Excel?)
   - Social proof (testimoniale + statistici)
   - FAQ accordion (răspunsuri la 5-7 întrebări top)
   - CTA final (Trial 30 zile)

2. **Despre** → `/despre`
   - Povestea fondatorului (tatăl tău admin de bloc)
   - Experiența ta în banking (optimizare procese)
   - Misiune: "Digitalizarea administrării condominiilor în România"
   - Echipa (când crește)
   - Valores: Transparență, Simplitate, Inovație

3. **Funcționalități** → `/functionalitati`
   - Lista completă de features (18+ features din app)
   - Fiecare feature cu:
     - Titlu + descriere scurtă
     - Screenshot/video demonstrativ
     - Beneficiu concret ("Economisești 3 ore/lună")
   - Comparație cu Excel (tabel side-by-side)
   - Comparație cu competitori (eBloc, Aviziero, etc.)

4. **Prețuri** → `/preturi`
   - 3 planuri: Starter, Professional, Enterprise
   - Tabel comparativ features per plan
   - FAQ prețuri (facturare, anulare, upgrade/downgrade)
   - Calculator cost ("Asociația ta cu 45 apartamente plătește 180 lei/lună")
   - CTA: "Încearcă gratuit 30 zile"

5. **Demo** → `/demo`
   - Video tutorial principal (embed YouTube)
   - Screenshots cu explicații text
   - Demo interactiv (opțional, Fază 2)
   - Link către documentație
   - CTA: "Înregistrează-te și testează singur"

6. **Blog** → `/blog`
   - Lista articole (card grid)
   - Filtrare pe categorii (Ghiduri, Legislație, Case Studies, Updates)
   - Search simplu (client-side)
   - Newsletter signup în sidebar

7. **Articol Blog** → `/blog/[slug]`
   - Markdown content
   - Table of contents (sticky sidebar)
   - Share buttons (Facebook, LinkedIn, WhatsApp)
   - Related articles (3-4 sugestii)
   - Author bio (tu + link către Despre)

8. **Contact** → `/contact`
   - Formular contact (Firebase Functions backend)
   - Email: contact@blocapp.ro
   - Telefon: +40 XXX XXX XXX (opțional)
   - Program suport: Luni-Vineri 9-18
   - FAQ link
   - Live chat widget (Tawk.to)

### Pagini Utilitare

9. **Termeni și Condiții** → `/termeni`
10. **Politică Confidențialitate** → `/confidentialitate`
11. **Politică Cookies** → `/cookies`
12. **404 Error** → custom page cu search și links utile

### Redirects către Aplicație

- **Login** → `/login` redirects la `app.blocapp.ro/login`
- **Înregistrare** → `/inregistrare` redirects la `app.blocapp.ro/register`
- **Trial** → `/trial` redirects la `app.blocapp.ro/register?trial=true`

---

## Design System și Componente

### Design Principles

1. **Simplitate** → Clean, minimal, focus pe conținut
2. **Profesionalism** → Trustworthy, business-oriented
3. **Accesibilitate** → WCAG AA compliant (contrast, keyboard nav)
4. **Consistență** → Match cu aplicația (Tailwind classes)

### Paleta de Culori

```css
/* Primary (Blue - trustworthy, profesional) */
--primary-50: #eff6ff;
--primary-100: #dbeafe;
--primary-500: #3b82f6;  /* Main brand color */
--primary-600: #2563eb;
--primary-700: #1d4ed8;

/* Secondary (Green - success, growth) */
--secondary-500: #10b981;
--secondary-600: #059669;

/* Neutral (Grays) */
--gray-50: #f9fafb;
--gray-100: #f3f4f6;
--gray-500: #6b7280;
--gray-700: #374151;
--gray-900: #111827;

/* Accent (Orange - CTA, highlights) */
--accent-500: #f97316;
--accent-600: #ea580c;
```

### Tipografie

```css
/* Heading font */
font-family: 'Inter', system-ui, sans-serif;
font-weight: 700;

/* Body font */
font-family: 'Inter', system-ui, sans-serif;
font-weight: 400;

/* Sizes */
h1: 3rem (48px) - Hero titles
h2: 2.25rem (36px) - Section titles
h3: 1.875rem (30px) - Subsection titles
h4: 1.5rem (24px) - Card titles
body: 1rem (16px) - Normal text
small: 0.875rem (14px) - Captions
```

### Componente Reutilizabile

**1. Header (Sticky Navigation)**
```jsx
<Header>
  - Logo (left)
  - Nav Links: Funcționalități, Prețuri, Blog, Despre, Contact
  - CTA Button: "Încearcă Gratuit" (primary button)
  - Mobile menu (hamburger icon)
</Header>
```

**2. Footer**
```jsx
<Footer>
  - 4 coloane:
    1. BlocApp (logo + tagline)
    2. Produs (Funcționalități, Prețuri, Demo, Documentație)
    3. Companie (Despre, Blog, Contact, Cariere)
    4. Legal (Termeni, Confidențialitate, Cookies)
  - Social media icons (Facebook, LinkedIn, YouTube)
  - Copyright © 2025 BlocApp SRL
</Footer>
```

**3. Hero Section**
```jsx
<Hero>
  - Headline (H1): "Administrează blocul fără Excel"
  - Subheadline: "Calculează întreținerea automat, elimină erorile..."
  - CTA primary: "Începe Trial Gratuit"
  - CTA secondary: "Vizionează Demo"
  - Hero image: Screenshot dashboard sau ilustrație
</Hero>
```

**4. Feature Card**
```jsx
<FeatureCard
  icon={<IconComponent />}
  title="Calculare Automată"
  description="Matematica corectă de fiecare dată..."
  link="/functionalitati#calculare"
/>
```

**5. Pricing Card**
```jsx
<PricingCard
  plan="Professional"
  price="3.99 lei/apartament"
  features={[...]}
  highlighted={true}
  cta="Încearcă 30 Zile Gratuit"
/>
```

**6. Testimonial Card**
```jsx
<TestimonialCard
  quote="Am trecut de la 4 ore pe lună..."
  author="Maria Ionescu"
  role="Administrator"
  association="Asociația Vulturilor 23, București"
  apartments="127 apartamente"
  avatar="/images/testimonials/maria.jpg"
/>
```

**7. CTA Button**
```jsx
<CTAButton
  variant="primary" // primary, secondary, outline
  size="lg" // sm, md, lg
  href="/trial"
>
  Încearcă Gratuit
</CTAButton>
```

**8. FAQ Accordion**
```jsx
<FAQAccordion>
  <FAQItem
    question="Cât durează implementarea?"
    answer="Aproximativ 2 ore pentru configurarea inițială..."
  />
</FAQAccordion>
```

**9. Newsletter Signup**
```jsx
<NewsletterSignup
  placeholder="Email-ul tău"
  buttonText="Abonează-te"
  onSubmit={handleNewsletterSignup}
/>
```

---

## Plan Implementare - Timeline 3 Săptămâni

### 📅 **Săptămâna 1: Foundation + Homepage**

#### **Ziua 1-2: Setup Proiect**

**Ziua 1:**
- ✅ Creează repo GitHub `blocapp-website`
- ✅ Inițializează Next.js 14: `npx create-next-app@latest`
  - TypeScript: No (egregore simple la început)
  - ESLint: Yes
  - Tailwind CSS: Yes
  - App Router: Yes
  - Turbopack: Yes
- ✅ Setup Vercel:
  - Connect GitHub repo
  - Configure auto-deploy (main branch)
  - Preview URLs pentru branches
- ✅ Configure environment variables `.env.local`
- ✅ Structură foldere:
  ```
  /app
    /page.js (homepage)
    /layout.js (root layout)
  /components
    /layout (Header, Footer)
    /ui (Button, Card, Input)
    /sections (Hero, Features, Testimonials)
  /content
    /blog (markdown files)
  /public
    /images
    /screenshots
  /styles
    /globals.css
  ```

**Ziua 2:**
- ✅ Design system setup în `tailwind.config.js`:
  - Custom colors (primary, secondary, accent)
  - Custom fonts (Inter from Google Fonts)
  - Custom spacing, shadows, border-radius
- ✅ Componente base UI:
  - Button component (variants: primary, secondary, outline)
  - Card component
  - Container component (max-width, padding)
  - Link component (internal + external)

#### **Ziua 3-4: Header + Footer + Base Layout**

**Ziua 3:**
- ✅ **Header component:**
  - Logo (SVG sau PNG)
  - Desktop navigation (flex, gap)
  - Mobile menu (hamburger → drawer)
  - Sticky positioning (sticky top-0 z-50)
  - Transparent → solid background on scroll
- ✅ **Footer component:**
  - 4 column grid (desktop) → stack (mobile)
  - Logo + tagline
  - Navigation links (grouped)
  - Social icons (lucide-react)
  - Copyright text

**Ziua 4:**
- ✅ **Root layout** (`app/layout.js`):
  - Metadata (title, description, OG tags)
  - Font loading (next/font)
  - Google Analytics script
  - Facebook Pixel script
  - Tawk.to live chat script
- ✅ Testare responsive (mobile, tablet, desktop)
- ✅ Deploy pe Vercel → preview link

#### **Ziua 5-7: Homepage Completă**

**Ziua 5:**
- ✅ **Hero Section:**
  - H1 headline: "Administrează blocul fără Excel"
  - Subheadline (2 propoziții)
  - 2 CTA buttons (primary + secondary)
  - Hero image/screenshot (dreapta pe desktop, jos pe mobile)
  - Background gradient sau pattern

**Ziua 6:**
- ✅ **Features Section:**
  - Grid 3 coloane (desktop) → 1 coloană (mobile)
  - 6 feature cards cu icon + title + description
  - Micro-animations pe hover (scale, shadow)
- ✅ **Benefits Section:**
  - "De ce BlocApp vs Excel?" (side-by-side comparison)
  - Tabel sau visual comparison
  - Statistici: "Economisești 70% timp", "Zero erori de calcul"

**Ziua 7:**
- ✅ **Social Proof Section:**
  - Testimoniale carousel (3-5 testimoniale)
  - Auto-rotate sau manual arrows
  - Avatar + quote + author + association
- ✅ **FAQ Section:**
  - Accordion cu 7-10 întrebări
  - Smooth expand/collapse animation
- ✅ **Final CTA Section:**
  - Centered CTA: "Gata să începi?"
  - Big primary button: "Încearcă 30 Zile Gratuit"
- ✅ **Polish homepage:**
  - Spacing consistent
  - Mobile responsive check
  - SEO meta tags
- ✅ **Deploy** și share link pentru feedback

---

### 📅 **Săptămâna 2: Pagini Statice + Blog System**

#### **Ziua 8-9: Pagina Despre**

**Ziua 8:**
- ✅ **Route:** `app/despre/page.js`
- ✅ **Content structure:**
  - Hero cu poză ta sau office space
  - Poveste fondator (tatăl tău admin de bloc)
  - Experiență banking (optimizare procese)
  - Misiune și vision
  - Valori (Transparență, Simplitate, Inovație)
- ✅ **Design:**
  - Timeline vizuală (2015: Începe admin → 2020: Banking → 2025: BlocApp)
  - Quote destacat: "Am întocmit sute de tabele Excel..."

**Ziua 9:**
- ✅ **Pagină Contact:**
  - Route: `app/contact/page.js`
  - Formular contact (name, email, message)
  - Firebase Functions backend (send email via SendGrid)
  - Success/error states
  - Contact info (email, telefon opțional)
  - Tawk.to live chat embed
- ✅ Test formular contact (end-to-end)

#### **Ziua 10-11: Pagina Funcționalități**

**Ziua 10:**
- ✅ **Route:** `app/functionalitati/page.js`
- ✅ **Content:**
  - Lista completă features (18+ din aplicație)
  - Grouped în categorii:
    - Administrare Structură (asociații, blocuri, scări, apartamente)
    - Gestiune Cheltuieli (11 tipuri, facturi, furnizori)
    - Calcule Întreținere (automatizare, distribuție, istoric)
    - Încasări și Plăți (chitanțe, balanțe, receipts)
    - Portal Proprietari (când e gata)
- ✅ **Design:**
  - Side-by-side: Feature description + screenshot
  - Alternating layout (left-right flip per feature)
  - Sticky TOC în sidebar pentru quick navigation

**Ziua 11:**
- ✅ **Comparație Excel vs BlocApp:**
  - Tabel comparison (Excel, BlocApp, Competitori)
  - Criteria: Timp, Erori, Colaborare, Istoric, Export, Mobile, etc.
  - Checkmarks, X marks, icons
- ✅ **Comparație Competitori:**
  - BlocApp vs eBloc, Aviziero, HomeFile
  - Features matrix (honest, nu minți despre competitori)
  - Highlight unde BlocApp e superior (UX, onboarding, tech)

#### **Ziua 12-13: Pagina Prețuri**

**Ziua 12:**
- ✅ **Route:** `app/preturi/page.js`
- ✅ **Pricing cards:**
  - 3 planuri: Starter (149 lei), Professional (3.99/apt), Enterprise (2.99/apt)
  - Highlight "Most Popular" pe Professional
  - Lista features per plan (checkmarks)
  - CTA button per card: "Încearcă Gratuit"
- ✅ **Toggle anual/lunar:**
  - Switch button (annual save 10%)
  - Price update animation

**Ziua 13:**
- ✅ **Calculator de cost:**
  - Input: Număr apartamente
  - Output: "Asociația ta plătește X lei/lună cu planul Y"
  - Recommended plan based on input
- ✅ **FAQ prețuri:**
  - Ce include trial-ul?
  - Pot anula oricând?
  - Cum funcționează upgrade/downgrade?
  - Emit facturi fiscale?
  - Ce metode de plată acceptați?
- ✅ **Trust signals:**
  - "Fără contract pe termen lung"
  - "Anulare oricând"
  - "Primele 30 zile gratuit"
  - "Suport inclus"

#### **Ziua 14: Blog System (Markdown-based)**

- ✅ **Setup:**
  - Install `gray-matter` și `remark` pentru Markdown parsing
  - Content în `/content/blog/*.md`
  - Metadata în frontmatter:
    ```markdown
    ---
    title: "Cum se calculează întreținerea"
    date: "2025-01-15"
    category: "Ghiduri"
    excerpt: "Ghid complet pentru repartizarea cheltuielilor..."
    author: "Fondator BlocApp"
    image: "/images/blog/calcul-intretinere.jpg"
    ---
    Conținut articol aici...
    ```
- ✅ **Routes:**
  - `app/blog/page.js` → Lista articole (grid)
  - `app/blog/[slug]/page.js` → Articol individual
- ✅ **Features:**
  - Category filtering
  - Search simplu (client-side filter)
  - Related articles (same category, random 3)
  - Social share buttons (Facebook, LinkedIn, WhatsApp)
  - Newsletter signup în sidebar
- ✅ **Scriere primele 2 articole** (placeholder content, îl îmbunătățim în Săptămâna 3)

---

### 📅 **Săptămâna 3: Demo + SEO + Polish + Launch**

#### **Ziua 15-16: Pagina Demo**

**Ziua 15:**
- ✅ **Route:** `app/demo/page.js`
- ✅ **Content:**
  - Hero: "Vezi BlocApp în acțiune"
  - Video embed (YouTube placeholder - înlocui când faci video)
  - Caption sub video: "Tutorial 5 minute: De la zero la prima listă de întreținere"
- ✅ **Screenshots gallery:**
  - 8-10 screenshots din aplicație cu captions
  - Lightbox pe click (enlarge image)
  - Categorii: Dashboard, Expenses, Maintenance, Invoices, Payments

**Ziua 16:**
- ✅ **Interactive demo** (opțional, Fază 2):
  - Embed Loom/Vimeo pentru guided tour
  - SAU link către aplicație demo (readonly account)
- ✅ **CTA final:**
  - "Gata să testezi singur?"
  - Button: "Creează Cont Gratuit"
- ✅ **Link către docs** (când le creezi)

#### **Ziua 17-18: Pagini Legale + SEO Optimization**

**Ziua 17:**
- ✅ **Termeni și Condiții:**
  - Route: `app/termeni/page.js`
  - Content: Template de pe TermsFeed.com adaptat pentru BlocApp
  - Secțiuni: Servicii, Cont, Plăți, Reziliere, Limitări răspundere
- ✅ **Politică Confidențialitate:**
  - Route: `app/confidentialitate/page.js`
  - GDPR compliant
  - Secțiuni: Date colectate, Utilizare, Cookies, Drepturi utilizatori
- ✅ **Politică Cookies:**
  - Route: `app/cookies/page.js`
  - Ce cookies folosim (Analytics, Marketing, Funcționale)
  - Cookie consent banner (simple popup, accept/decline)

**Ziua 18:**
- ✅ **SEO Optimization:**
  - Meta tags per pagină (title, description, OG tags)
  - `app/robots.txt`: Allow all except `/api`
  - `app/sitemap.xml`: Generate dinamic cu Next.js
  - Schema markup (JSON-LD):
    - Organization schema (homepage)
    - Article schema (blog posts)
    - FAQ schema (FAQ sections)
    - Product schema (pricing page)
  - Image optimization:
    - Use `next/image` pentru lazy loading
    - WebP format pentru screenshots
    - Alt tags descriptive
  - Internal linking strategy:
    - Homepage → toate paginile principale
    - Blog articles → related articles
    - Footer → toate paginile
- ✅ **Performance optimization:**
  - Code splitting (automatic cu Next.js App Router)
  - Font optimization (next/font)
  - Lazy load images below fold
  - Minimize CSS/JS

#### **Ziua 19-20: Testing + Fixes + Polish**

**Ziua 19:**
- ✅ **Cross-browser testing:**
  - Chrome, Firefox, Safari, Edge
  - Check layout, animations, forms
- ✅ **Responsive testing:**
  - Mobile (320px, 375px, 414px)
  - Tablet (768px, 1024px)
  - Desktop (1280px, 1920px)
  - Test hamburger menu, accordions, carousels
- ✅ **Accessibility testing:**
  - Keyboard navigation (Tab, Enter, Escape)
  - Screen reader test (basic check)
  - Color contrast (WCAG AA)
  - Focus states pe buttons/links
- ✅ **Form testing:**
  - Contact form (success/error states)
  - Newsletter signup
  - Validation messages

**Ziua 20:**
- ✅ **Content review:**
  - Proofread toate textele (gramatică, typos)
  - Check link-uri (nu broken links)
  - Verifică screenshot-uri (sunt clare, relevante)
- ✅ **Analytics setup:**
  - Google Analytics 4
  - Facebook Pixel
  - Events tracking:
    - Trial signup click
    - Demo view
    - Contact form submit
    - Pricing card click
- ✅ **Final touches:**
  - Loading states pentru async operations
  - Error boundaries
  - 404 page custom (cu search și helpful links)
  - Favicon și app icons (multiple sizes)

#### **Ziua 21: Launch Preparation + Deploy**

- ✅ **Pre-launch checklist:**
  - [ ] Toate paginile funcționale
  - [ ] Forms trimit email-uri
  - [ ] Analytics tracking funcționează
  - [ ] Mobile responsive 100%
  - [ ] SEO meta tags pe toate paginile
  - [ ] Sitemap.xml generat
  - [ ] Robots.txt configurat
  - [ ] Termeni + Confidențialitate publicate
  - [ ] Cookie consent implementat
  - [ ] Live chat Tawk.to funcționează
- ✅ **Configurare domeniu:**
  - Achiziționează `blocapp.ro` (GoDaddy/HostPapa)
  - Configure DNS records în Vercel:
    - A record: 76.76.21.21
    - CNAME: cname.vercel-dns.com
  - SSL certificate (automatic de Vercel)
- ✅ **Deploy final:**
  - Merge branch `develop` → `main`
  - Vercel auto-deploy
  - Check live site pe blocapp.ro
  - Smoke testing production
- ✅ **Announcement:**
  - Post pe social media: "BlocApp website is live!"
  - Share în grupuri Facebook
  - Email către early beta testers (dacă ai)

---

## Administrare Site După Lansare

### Pentru Tine (Non-Tehnic) - Cum Adaugi Conținut

#### **1. Articole Blog (Markdown)**

**Pași:**
1. Deschide folder `/content/blog/`
2. Creează fișier nou: `nume-articol.md`
3. Adaugă frontmatter:
   ```markdown
   ---
   title: "Titlul Articolului"
   date: "2025-01-20"
   category: "Ghiduri"
   excerpt: "Scurtă descriere pentru preview..."
   author: "Numele Tău"
   image: "/images/blog/imagine-articol.jpg"
   ---

   ## Introducere

   Textul articolului aici...

   ### Subtitlu 1

   Mai mult text...
   ```
4. Salvează fișierul
5. Git commit + push:
   ```bash
   git add content/blog/nume-articol.md
   git commit -m "Add new blog article: Titlu"
   git push origin main
   ```
6. Vercel auto-deploy în 2-3 minute
7. Check live pe blocapp.ro/blog/nume-articol

**Formatare Markdown:**
- `# Heading 1`, `## Heading 2`, `### Heading 3`
- `**bold text**`, `*italic text*`
- `[link text](URL)`
- `![alt text](image-url)`
- Liste: `- item` sau `1. item`
- Code: \`inline code\` sau \`\`\`block code\`\`\`

#### **2. Update Prețuri**

**Pași:**
1. Deschide `app/preturi/page.js`
2. Găsește array-ul `pricingPlans`:
   ```javascript
   const pricingPlans = [
     {
       name: "Starter",
       price: 149,
       unit: "lună",
       features: ["Până la 30 apartamente", ...],
       ...
     },
     ...
   ]
   ```
3. Modifică price sau features
4. Git commit + push
5. Live în 3 minute

#### **3. Update Testimoniale**

**Pași:**
1. Deschide `app/page.js` (homepage)
2. Găsește array-ul `testimonials`:
   ```javascript
   const testimonials = [
     {
       quote: "Textul testimonialului...",
       author: "Nume",
       role: "Administrator",
       association: "Asociația X",
       ...
     },
     ...
   ]
   ```
3. Adaugă/modifică testimonial
4. Git commit + push

**TIP:** Pentru conținut frecvent editat (testimoniale, FAQ, prețuri), putem crea în viitor un admin panel simplu sau content management în Firebase.

### Pentru Mine (Tehnic) - Maintenance

**Lunar:**
- [ ] Check analytics (ce pagini sunt populare?)
- [ ] Review performance (Google PageSpeed)
- [ ] Update dependencies (npm update)
- [ ] Check broken links (tool: broken-link-checker)

**Quarterly:**
- [ ] SEO audit (keywords ranking, backlinks)
- [ ] A/B testing (headlines, CTA buttons)
- [ ] Content refresh (update old articles)

---

## SEO Strategy - Checklist

### On-Page SEO ✅

- [x] **Title tags:** Unique per page, <60 chars, include keyword
  - Homepage: "BlocApp - Software Administrare Bloc | Calculare Întreținere Automată"
  - Funcționalități: "Funcționalități BlocApp | Software Asociație Proprietari"
  - Prețuri: "Prețuri BlocApp | De la 3.99 lei/apartament"
  - Blog: "[Titlu Articol] | Blog BlocApp"

- [x] **Meta descriptions:** Unique, <160 chars, include CTA
  - Homepage: "Administrează blocul fără Excel. Calculează întreținerea automat, elimină erorile, economisește 70% timp. Trial gratuit 30 zile. →"

- [x] **H1 tags:** One per page, include primary keyword
  - Homepage: "Administrează blocul fără Excel"
  - Funcționalități: "Funcționalități Complete pentru Administrarea Blocului"

- [x] **URL structure:** Clean, keyword-rich, lowercase
  - Good: `/functionalitati/calculare-intretinere`
  - Bad: `/page?id=123&section=features`

- [x] **Image optimization:**
  - Alt tags descriptive
  - WebP format (next/image auto-converts)
  - Lazy loading below fold

- [x] **Internal linking:**
  - Homepage → all key pages
  - Blog articles → related articles
  - Footer → sitemap

- [x] **Schema markup (JSON-LD):**
  - Organization schema (homepage)
  - Article schema (blog)
  - FAQ schema (FAQ sections)
  - SoftwareApplication schema (homepage)

### Technical SEO ✅

- [x] **Sitemap.xml:** Auto-generated by Next.js
- [x] **Robots.txt:** Allow all except /api
- [x] **Canonical URLs:** Prevent duplicate content
- [x] **Mobile-friendly:** Responsive design
- [x] **Page speed:** 95+ Google PageSpeed (Next.js optimizations)
- [x] **HTTPS:** SSL certificate (Vercel automatic)
- [x] **Core Web Vitals:**
  - LCP (Largest Contentful Paint): <2.5s
  - FID (First Input Delay): <100ms
  - CLS (Cumulative Layout Shift): <0.1

### Off-Page SEO (Manual, Post-Launch)

- [ ] **Google My Business:** Claim listing (când ai firmă)
- [ ] **Backlinks:**
  - Guest posts pe bloguri imobiliare
  - Listare în directoare: Startarium.ro, startup.ro
  - Partnerships cu contabili (link pe site-ul lor)
- [ ] **Social signals:**
  - Share articles pe Facebook, LinkedIn
  - Engagement în grupuri (comments, likes)
- [ ] **Local SEO:**
  - Target "administrare bloc București", "software asociație proprietari Cluj"
  - Location pages (opțional, Fază 2)

---

## Analytics & Tracking - Ce Monitorizăm

### Google Analytics 4 Events

**Automatic Events (GA4 default):**
- Page views
- Session start
- First visit
- Scroll depth
- Outbound clicks

**Custom Events (manual setup):**
```javascript
// Trial signup button click
gtag('event', 'trial_signup_click', {
  'button_location': 'hero', // sau 'footer', 'pricing'
  'page_url': window.location.href
});

// Demo video play
gtag('event', 'demo_video_play', {
  'video_title': 'BlocApp Tutorial',
  'duration': video.duration
});

// Contact form submit
gtag('event', 'contact_form_submit', {
  'form_location': 'contact_page'
});

// Pricing card click
gtag('event', 'pricing_card_click', {
  'plan_name': 'Professional',
  'price': '3.99 lei/apt'
});

// Blog article read
gtag('event', 'article_read', {
  'article_title': title,
  'category': category,
  'read_time': estimatedTime
});
```

### Facebook Pixel Events

```javascript
// Page view (automatic)
fbq('track', 'PageView');

// Trial signup
fbq('track', 'Lead', {
  content_name: 'Trial Signup',
  value: 0
});

// Contact form submit
fbq('track', 'Contact');

// Pricing page view
fbq('track', 'ViewContent', {
  content_name: 'Pricing Page'
});
```

### Dashboard Metrics (Review Săptămânal)

| Metric | Target Luna 1 | Target Luna 3 | Target Luna 6 |
|--------|---------------|---------------|---------------|
| **Traffic** |
| Visitors | 300 | 2,000 | 8,000 |
| Pageviews | 1,000 | 6,000 | 25,000 |
| Bounce rate | <60% | <55% | <50% |
| Avg session duration | >2 min | >3 min | >4 min |
| **Conversions** |
| Trial signups | 5 | 50 | 150 |
| Conversion rate | 1.5% | 2.5% | 2% |
| Contact forms | 3 | 20 | 60 |
| Newsletter signups | 10 | 100 | 400 |
| **Engagement** |
| Blog article reads | 50 | 500 | 2,000 |
| Demo video views | 10 | 80 | 300 |
| Avg pages per session | 3 | 4 | 5 |

---

## Content Needed - Checklist pentru Tine

### Text Content ✅ (Generat în WEBSITE_CONTENT.md)

- [x] Headline homepage (H1)
- [x] Subheadline homepage
- [x] 7 beneficii principale
- [x] 5 testimoniale
- [x] Poveste "Despre" (200-300 cuvinte)
- [x] 10 întrebări FAQ
- [x] Descriere scurtă pentru meta tags

### Visual Assets 🎨 (Ai nevoie să creezi/furnizezi)

**Urgent (Săptămâna 1-2):**
- [ ] **Logo BlocApp:**
  - Format: SVG (scalabil) + PNG (fallback)
  - Variante: Full color, White (pentru footer dark), Icon only
  - Size: Orice (SVG scalează), PNG minim 512x512px
  - **Opțiuni:**
    - Creez eu un logo simplu (text + icon)
    - Freelancer pe Fiverr (500 lei, 3-5 zile)
    - Tool online: Canva, Looka.com (AI-generated)

**Important (Săptămâna 2-3):**
- [ ] **Screenshots aplicație (8-10 bucăți):**
  1. Dashboard overview
  2. Lista asociații
  3. Structură bloc (scări, apartamente)
  4. Formular adăugare cheltuială
  5. Listă facturi
  6. Tabel întreținere (Maintenance Table)
  7. Modal breakdown cheltuieli per apartament
  8. Formular înregistrare plată
  9. Generare chitanță PDF
  10. Exports (PDF, Excel)

  **Cum le faci:**
  - Deschide aplicația în browser
  - Zoom la 100% (nu 150% sau 80%)
  - Screenshot full screen (Win+Shift+S)
  - Crop la viewport (fără taskbar/address bar)
  - Salvează ca PNG
  - Compress cu TinyPNG.com (reduce size 70%)

**Nice-to-have (Săptămâna 3+):**
- [ ] **Poză ta:**
  - Pentru pagina "Despre"
  - Profesională dar friendly
  - Background neutru
  - Format: Portrait, 600x800px minim
- [ ] **Video tutorial (3-5 minute):**
  - Screen recording cu OBS Studio (gratuit)
  - Narration în română (microfon decent, nu laptop mic)
  - Edit cu DaVinci Resolve (gratuit) sau Camtasia
  - Upload pe YouTube (canal BlocApp)
  - Embed pe website
  - **Script video:**
    1. Intro (20s): "Salut, sunt [Nume], creatorul BlocApp..."
    2. Problema (40s): "Dacă administrezi un bloc, știi cât timp..."
    3. Soluție (2min): Demo live - creează asociație → adaugă cheltuieli → generează listă
    4. Beneficii (40s): "În loc de 4 ore, acum 30 minute..."
    5. CTA (20s): "Încearcă gratuit 30 zile la blocapp.ro"

---

## Next Steps După Aprobare Planului

1. **Acum (Ziua 1):**
   - ✅ Salvez acest plan în `docs/WEBSITE_PLAN.md`
   - ✅ Creez todo list în TodoWrite
   - ✅ Setup repo GitHub `blocapp-website`
   - ✅ Init Next.js project

2. **Tu (Zilele 1-7):**
   - 🎨 Decide logo (creez eu simplu sau outsource?)
   - 📸 Fă 8-10 screenshots din aplicație
   - 📝 Review homepage (îți trimit preview link Vercel)

3. **Săptămâna 2:**
   - 🔄 Iterez pe feedback tău
   - 📄 Completez pagini Despre, Funcționalități, Prețuri

4. **Săptămâna 3:**
   - 🚀 Launch pe blocapp.ro
   - 📣 Anunț public

**Gata să începem?** 🚀

---

**Document creat:** 2 Noiembrie 2025
**Versiune:** 1.0
**Autor:** Claude
**Status:** Aprobat pentru execuție
**Next review:** După Săptămâna 2 (feedback pe preview)
