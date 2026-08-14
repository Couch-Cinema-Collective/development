import Link from "next/link";
import { notFound } from "next/navigation";

import { FilmPoster } from "@/components/FilmPoster";
import { CATEGORIES_BY_ID, SEASON_CATEGORIES } from "@/lib/mock/categories";
import { findFilmByTitle } from "@/lib/tmdb";

export function generateStaticParams() {
  return SEASON_CATEGORIES.map((category) => ({ slug: category.id }));
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = CATEGORIES_BY_ID.get(slug);
  if (!category) notFound();

  // Exemplars are stored as titles; resolve them to real records for artwork.
  const exemplars = await Promise.all(
    category.exemplars.map(async (title) => ({
      title,
      film: await findFilmByTitle(title),
    })),
  );

  const related = SEASON_CATEGORIES.filter(
    (c) => c.family === category.family && c.id !== category.id,
  ).slice(0, 4);

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <Link href="/wiki" className="label-eyebrow transition-colors hover:text-ink">
        ← Film School
      </Link>

      <header className="mt-6 border-b border-rule pb-8">
        <p className="label-eyebrow text-signal">{category.family}</p>
        <h1 className="mt-3 text-balance text-6xl font-medium uppercase leading-[0.95] tracking-tight">
          {category.name}
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-soft">
          {category.blurb}
        </p>
      </header>

      <section className="mt-12">
        <h2 className="label-eyebrow">Four textbook cases</h2>
        <p className="mt-2 max-w-lg text-xs leading-relaxed text-ink-faint">
          Not the best four — the four that define the shape. Start anywhere.
        </p>

        <ul className="mt-8 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4">
          {exemplars.map(({ title, film }) => (
            <li key={title}>
              {film ? (
                <>
                  <FilmPoster film={film} />
                  <p className="mt-3 text-sm tracking-tight">{film.title}</p>
                  <p className="text-xs text-ink-faint">
                    {film.director} · {film.year}
                  </p>
                </>
              ) : (
                <>
                  <div className="flex aspect-[2/3] items-center justify-center border border-dashed border-rule p-4 text-center">
                    <span className="text-sm uppercase tracking-tight text-ink-faint">
                      {title}
                    </span>
                  </div>
                  <p className="mt-3 text-sm tracking-tight">{title}</p>
                  <p className="text-xs text-ink-faint">Not found on TMDB</p>
                </>
              )}
            </li>
          ))}
        </ul>
      </section>

      {related.length > 0 && (
        <section className="mt-16 border-t border-rule pt-8">
          {/* Same-family, not genuinely related — a relatedness model is a later job. */}
          <h2 className="label-eyebrow">More in {category.family}</h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {related.map((other) => (
              <li key={other.id}>
                <Link
                  href={`/wiki/${other.id}`}
                  className="block border border-rule px-4 py-2 text-sm transition-colors hover:border-ink"
                >
                  {other.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-16 border border-ink bg-paper-raised px-6 py-6">
        <p className="label-eyebrow">Run this as a season</p>
        <p className="mt-2 max-w-lg text-sm leading-relaxed text-ink-soft">
          Set the clock, pick the awards, and let your guild nominate. Six films
          over three months is the recommended shape.
        </p>
        <Link
          href="/commissioner/new"
          className="mt-5 inline-block bg-ink px-6 py-3 text-xs uppercase tracking-[0.12em] text-paper transition-colors hover:bg-signal"
        >
          Commission a season
        </Link>
      </section>
    </main>
  );
}
