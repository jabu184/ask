import { useEffect } from 'react';

/**
 * Lightweight, zero-dependency SEO head manager.
 * Updates document title, standard meta description, Open Graph, Twitter cards, and canonical links on route transitions.
 */
export default function SEO({
  title = 'Ask by urspace.com | Free Online Survey Creator & Instant Analytics',
  description = 'Design modern online surveys with 8+ question types, real-time analytics graphs, and one-click Excel/CSV data exports. Completely free with no subscription required.',
  keywords = 'free surveys, online survey maker, questionnaire builder, feedback analytics, rating surveys, Ask by urspace',
  canonicalUrl,
  ogType = 'website',
  ogImage = 'https://ask.urspace.com/askbuurspace.jpg',
  structuredData,
}) {
  useEffect(() => {
    // 1. Update Document Title
    document.title = title;

    // Helper to set or create a meta tag
    const setMetaTag = (attrName, attrValue, content) => {
      let element = document.querySelector(`meta[${attrName}="${attrValue}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attrName, attrValue);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content || '');
    };

    // 2. Standard Meta Tags
    setMetaTag('name', 'description', description);
    setMetaTag('name', 'keywords', keywords);

    // 3. Open Graph Tags
    const currentUrl = canonicalUrl || (typeof window !== 'undefined' ? window.location.href : 'https://ask.urspace.com');
    setMetaTag('property', 'og:title', title);
    setMetaTag('property', 'og:description', description);
    setMetaTag('property', 'og:type', ogType);
    setMetaTag('property', 'og:image', ogImage);
    setMetaTag('property', 'og:site_name', 'Ask by urspace.com');
    setMetaTag('property', 'og:url', currentUrl);

    // 4. Twitter Card Tags
    setMetaTag('name', 'twitter:card', 'summary_large_image');
    setMetaTag('name', 'twitter:title', title);
    setMetaTag('name', 'twitter:description', description);
    setMetaTag('name', 'twitter:image', ogImage);

    // 5. Canonical Link
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', currentUrl);

    // 6. Optional Structured Data (JSON-LD)
    let jsonLdScript = null;
    if (structuredData) {
      const existing = document.getElementById('page-structured-data');
      if (existing && existing.parentNode) existing.parentNode.removeChild(existing);

      jsonLdScript = document.createElement('script');
      jsonLdScript.type = 'application/ld+json';
      jsonLdScript.id = 'page-structured-data';
      jsonLdScript.text = JSON.stringify(structuredData);
      document.head.appendChild(jsonLdScript);
    }

    return () => {
      if (jsonLdScript && jsonLdScript.parentNode) {
        jsonLdScript.parentNode.removeChild(jsonLdScript);
      }
    };
  }, [title, description, keywords, canonicalUrl, ogType, ogImage, structuredData]);

  return null;
}
