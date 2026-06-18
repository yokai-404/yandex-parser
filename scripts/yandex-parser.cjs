#!/usr/bin/env node
const fs = require('fs');
const crypto = require('crypto');
const { chromium } = require('playwright');

const inputUrl = process.argv[2];
const DEBUG = process.argv.includes('--debug');
const outFileArg = process.argv.find((arg) => arg.startsWith('--out='));
const outFile = outFileArg ? outFileArg.slice('--out='.length) : null;

if (!inputUrl) {
  console.error('Usage: node scripts/yandex-parser.cjs "<yandex_url>" [--debug] [--out=out.json]');
  process.exit(1);
}

function clean(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).replace(/\s+/g, ' ').trim();
  return text.length ? text : null;
}

function parseNumber(value) {
  if (value === null || value === undefined) return null;
  const raw = String(value).replace(/\s/g, '').replace(',', '.');
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function parseInteger(value) {
  if (value === null || value === undefined) return null;
  const raw = String(value).replace(/[^\d]/g, '');
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function normalizeDate(value) {
  const text = clean(value);
  if (!text) return null;

  const lower = text.toLowerCase();
  const now = new Date();

  if (lower.includes('вчера')) {
    now.setDate(now.getDate() - 1);
    return now.toISOString().slice(0, 10);
  }

  const relativeMatch = text.match(/(\d+)\s*(минут|час|дн|день|недел|месяц|год)/i);
  if (relativeMatch) {
    const n = parseInt(relativeMatch[1], 10);
    const d = new Date();

    if (/минут/i.test(relativeMatch[2])) d.setMinutes(d.getMinutes() - n);
    else if (/час/i.test(relativeMatch[2])) d.setHours(d.getHours() - n);
    else if (/дн|день/i.test(relativeMatch[2])) d.setDate(d.getDate() - n);
    else if (/недел/i.test(relativeMatch[2])) d.setDate(d.getDate() - n * 7);
    else if (/месяц/i.test(relativeMatch[2])) d.setMonth(d.getMonth() - n);
    else if (/год/i.test(relativeMatch[2])) d.setFullYear(d.getFullYear() - n);

    return d.toISOString().slice(0, 10);
  }

  const d = new Date(text);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);

  return text;
}

function uniqBy(arr, keyFn) {
  const seen = new Set();
  return arr.filter((item) => {
    const key = keyFn(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function sha1(input) {
  return crypto.createHash('sha1').update(String(input)).digest('hex');
}

function makePageUrl(baseUrl, pageNumber) {
  const url = new URL(baseUrl);
  if (pageNumber <= 1) {
    url.searchParams.delete('page');
  } else {
    url.searchParams.set('page', String(pageNumber));
  }
  return url.toString();
}

function extractPlaceFromJsonLd(jsonLdObjects) {
  for (const obj of jsonLdObjects) {
    if (!obj || typeof obj !== 'object') continue;

    const aggregate = obj.aggregateRating || obj.aggregate_rating;
    if (!aggregate) continue;

    const title = clean(obj.name || obj.title);
    const rating = parseNumber(aggregate.ratingValue || aggregate.rating_value);
    const reviewsCount = parseInteger(aggregate.reviewCount || aggregate.review_count);
    const ratingsCount = parseInteger(aggregate.ratingCount || aggregate.rating_count);

    return {
      title,
      rating,
      reviews_count: reviewsCount,
      ratings_count: ratingsCount,
    };
  }

  return {
    title: null,
    rating: null,
    reviews_count: null,
    ratings_count: null,
  };
}

function findMatchingBracket(text, openIndex, openChar, closeChar) {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = openIndex; i < text.length; i += 1) {
    const ch = text[i];

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === '\\') {
        escaped = true;
        continue;
      }
      if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === openChar) {
      depth += 1;
      continue;
    }

    if (ch === closeChar) {
      depth -= 1;
      if (depth === 0) return i;
    }
  }

  return -1;
}

function extractReviewsMetaFromHtml(html) {
  const reviewCountMeta =
    html.match(/itemprop="reviewCount" content="(\d+)"/i) ||
    html.match(/"reviewCount"\s*:\s*(\d+)/i);

  const ratingCountMeta =
    html.match(/itemprop="ratingCount" content="(\d+)"/i) ||
    html.match(/"ratingCount"\s*:\s*(\d+)/i);

  const totalPagesMatch = html.match(/"totalPages":(\d+)/i);
  const paramsCountMatch = html.match(/"params":\{[^}]*"count":(\d+)/i);

  return {
    reviews_count: reviewCountMeta ? Number(reviewCountMeta[1]) : (paramsCountMatch ? Number(paramsCountMatch[1]) : null),
    ratings_count: ratingCountMeta ? Number(ratingCountMeta[1]) : null,
    total_pages: totalPagesMatch ? Number(totalPagesMatch[1]) : null,
  };
}

function extractEmbeddedReviewsFromHtml(html) {
  const markers = [
    '"reviewResults":{"reviews":',
    '"reviews":{"businessReviews":',
    '"businessReviews":',
  ];

  for (const marker of markers) {
    const idx = html.indexOf(marker);
    if (idx === -1) continue;

    const openIndex = html.indexOf('[', idx);
    if (openIndex === -1) continue;

    const closeIndex = findMatchingBracket(html, openIndex, '[', ']');
    if (closeIndex === -1) continue;

    const slice = html.slice(openIndex, closeIndex + 1);

    try {
      const parsed = JSON.parse(slice);
      if (!Array.isArray(parsed)) continue;

      return parsed
        .map((item) => {
          if (!item || typeof item !== 'object') return null;

          const author =
            clean(item.author?.name) ||
            clean(item.authorName) ||
            clean(item.author?.displayName) ||
            clean(item.nickname) ||
            clean(item.name);

          const text = clean(item.text) || clean(item.reviewBody) || clean(item.body);
          const rating = parseNumber(item.rating ?? item.score ?? item.stars ?? item.mark);
          const date = normalizeDate(item.updatedTime ?? item.createdAt ?? item.date ?? item.publishedAt);
          const externalId = clean(item.reviewId ?? item.id ?? item.uid ?? item.uuid);

          return {
            external_id: externalId,
            author,
            date,
            text,
            rating,
            raw: item,
          };
        })
        .filter((r) => r && (r.author || r.text || r.rating !== null || r.date));
    } catch {
      // ignore and try next marker
    }
  }

  return [];
}

async function extractReviewsFromDom(page) {
  const reviews = await page.$$eval('div.business-reviews-card-view__review', (nodes) => {
    const clean = (value) => {
      if (value === null || value === undefined) return null;
      const text = String(value).replace(/\s+/g, ' ').trim();
      return text.length ? text : null;
    };

    const parseNumber = (value) => {
      if (value === null || value === undefined) return null;
      const raw = String(value).replace(/\s/g, '').replace(',', '.');
      const n = Number(raw);
      return Number.isFinite(n) ? n : null;
    };

    const parseFromAria = (aria) => {
      if (!aria) return null;
      const match = String(aria).match(/Оценка\s*([0-9]+(?:[.,][0-9]+)?)/i);
      return match ? parseNumber(match[1]) : null;
    };

    return nodes
      .map((node) => {
        const author =
          clean(node.querySelector('.business-review-view__author-name [itemprop="name"]')?.textContent) ||
          clean(node.querySelector('.business-review-view__author-name')?.textContent) ||
          clean(node.querySelector('span[itemprop="name"]')?.textContent);

        const ratingMeta =
          node.querySelector('span[itemprop="reviewRating"] meta[itemprop="ratingValue"]')?.getAttribute('content') ||
          node.querySelector('meta[itemprop="ratingValue"]')?.getAttribute('content') ||
          node.querySelector('.business-rating-badge-view__stars')?.getAttribute('aria-label') ||
          node.querySelector('.business-rating-badge-view__stars')?.getAttribute('title');

        const rating = ratingMeta && String(ratingMeta).includes('Оценка')
          ? parseFromAria(ratingMeta)
          : parseNumber(ratingMeta);

        const date =
          node.querySelector('.business-review-view__date meta[itemprop="datePublished"]')?.getAttribute('content') ||
          node.querySelector('meta[itemprop="datePublished"]')?.getAttribute('content') ||
          clean(node.querySelector('.business-review-view__date span')?.textContent) ||
          clean(node.querySelector('.business-review-view__date')?.textContent);

        const text =
          clean(node.querySelector('.business-review-view__body .spoiler-view__text-container')?.textContent) ||
          clean(node.querySelector('.business-review-view__body')?.textContent) ||
          clean(node.querySelector('[itemprop="reviewBody"] .spoiler-view__text-container')?.textContent) ||
          clean(node.querySelector('[itemprop="reviewBody"]')?.textContent);

        return {
          external_id: null,
          author,
          date,
          text,
          rating,
          raw: null,
        };
      })
      .filter((review) => review.author || review.text || review.date || review.rating !== null);
  }).catch(() => []);

  return reviews;
}

async function captureJsonLd(page) {
  const scripts = await page.locator('script[type="application/ld+json"]').allTextContents().catch(() => []);
  const objects = [];

  for (const script of scripts) {
    const text = clean(script);
    if (!text) continue;

    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) objects.push(...parsed);
      else objects.push(parsed);
    } catch {
      // ignore broken JSON-LD
    }
  }

  return objects;
}

async function collectPageData(page, pageNumber) {
  const pageUrl = makePageUrl(inputUrl, pageNumber);

  await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(2000);
  await page.waitForSelector('div.business-reviews-card-view__review', { timeout: 15000 }).catch(() => {});

  const html = await page.content();

  if (DEBUG && pageNumber === 1) {
    fs.writeFileSync('page.html', html, 'utf8');
  }

  const bodyText = clean(await page.locator('body').innerText({ timeout: 15000 }).catch(() => '')) || '';
  const title = clean(await page.title().catch(() => '')) || null;

  const jsonLdObjects = await captureJsonLd(page);
  const placeFromJsonLd = extractPlaceFromJsonLd(jsonLdObjects);
  const reviewsMeta = extractReviewsMetaFromHtml(html);

  const place = {
    title: placeFromJsonLd.title || title,
    rating: placeFromJsonLd.rating,
    reviews_count: placeFromJsonLd.reviews_count,
    ratings_count: placeFromJsonLd.ratings_count,
  };

  if (place.rating === null) {
    const ratingMatch =
      bodyText.match(/Рейтинг\s*([0-9]+[.,][0-9]+)/i) ||
      bodyText.match(/([0-9]+[.,][0-9])\s*из\s*5/i) ||
      bodyText.match(/([0-9]+[.,][0-9])\s*\/\s*5/i);

    place.rating = ratingMatch ? parseNumber(ratingMatch[1]) : null;
  }

  if (reviewsMeta.reviews_count !== null) {
    place.reviews_count = reviewsMeta.reviews_count;
  }

  if (reviewsMeta.ratings_count !== null) {
    place.ratings_count = reviewsMeta.ratings_count;
  }

  let reviews = await extractReviewsFromDom(page);
  if (!reviews.length) {
    reviews = extractEmbeddedReviewsFromHtml(html);
  }

  return {
    source_url: pageUrl,
    place,
    reviews,
    total_pages: reviewsMeta.total_pages,
  };
}

(async () => {
  const browser = await chromium.launch({ headless: true });

  const page = await browser.newPage({
    viewport: { width: 1440, height: 2200 },
    locale: 'ru-RU',
  });

  try {
    const firstPage = await collectPageData(page, 1);

    let allReviews = firstPage.reviews;
    const place = firstPage.place;
    const maxPages = firstPage.total_pages || 12;

    for (let currentPage = 2; currentPage <= maxPages; currentPage += 1) {
      const nextPage = await collectPageData(page, currentPage);
      const before = allReviews.length;

      allReviews = uniqBy([...allReviews, ...nextPage.reviews], (review) => {
        const fingerprint = [
          review.external_id || '',
          review.author || '',
          review.date || '',
          review.text || '',
          review.rating ?? '',
        ].join('|');

        return sha1(fingerprint);
      });

      if (DEBUG) {
        console.error(`[page ${currentPage}] reviews: ${nextPage.reviews.length}, total: ${allReviews.length}`);
      }

      if (nextPage.reviews.length === 0) {
        break;
      }

      if (allReviews.length === before && currentPage > 2) {
        break;
      }

      if (allReviews.length >= 600) {
        allReviews = allReviews.slice(0, 600);
        break;
      }
    }

    const result = {
      source_url: inputUrl,
      place: {
        title: place.title,
        rating: place.rating,
        reviews_count: place.reviews_count,
        ratings_count: place.ratings_count,
      },
      reviews: allReviews.map((review) => ({
        external_id: review.external_id || sha1([review.author || '', review.date || '', review.text || '', review.rating ?? ''].join('|')),
        author: review.author,
        date: review.date,
        text: review.text,
        rating: review.rating,
        raw: DEBUG ? review.raw : undefined,
      })),
    };

    const payload = JSON.stringify(result, null, 2);

    if (outFile) {
      fs.writeFileSync(outFile, payload, 'utf8');
    } else {
      process.stdout.write(payload + '\n');
    }

    await browser.close();
  } catch (error) {
    await browser.close();

    const errPayload = JSON.stringify({
      message: error.message,
      stack: error.stack,
    }, null, 2);

    if (outFile) {
      fs.writeFileSync(outFile.replace(/\.json$/i, '.error.json'), errPayload, 'utf8');
    } else {
      console.error(errPayload);
    }

    process.exit(1);
  }
})();