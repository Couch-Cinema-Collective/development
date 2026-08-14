import Link from "next/link";

import {
  CATEGORY_FAMILIES,
  SEASON_CATEGORIES,
  type CategoryFamily,
} from "@/lib/mock/categories";

/**
 * The film school (PLAN.md §4D). Open to anyone — no guild membership required.
 * This is the top of the funnel: people arrive asking what body horror is.
 */
export default function WikiPage() {
  const byFamily = CATEGORY_FAMILIES.map((family) => ({
    family,
    categories: SEASON_CATEGORIES.filter((c) => c.family === family),
  })).filter((group) => group.categories.length > 0);

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <header className="border-b border-rule pb-8">
        <p className="label-eyebrow">The Collection</p>
        <h1 className="mt-3 text-6xl font-medium uppercase leading-none tracking-tight">
          Film School
        </h1>
        <p className="mt-5 max-w-xl text-sm leading-relaxed text-ink-soft">
          Every category a season can be built from, with a plain definition and
          four films that demonstrate it. Not a ranking — a starting point.
        </p>
        <p className="mt-3 text-xs text-ink-faint">
          {SEASON_CATEGORIES.length} categories.
        </p>
      </header>

      <div className="mt-14 space-y-16">
        {byFamily.map((group) => (
          <FamilySection key={group.family} {...group} />
        ))}
      </div>
    </main>
  );
}

function FamilySection({
  family,
  categories,
}: {
  family: CategoryFamily;
  categories: typeof SEASON_CATEGORIES;
}) {
  return (
    <section>
      <div className="flex items-baseline gap-4">
        <h2 className="label-eyebrow">{family}</h2>
        <span className="text-xs text-ink-faint tabular-nums">
          {categories.length}
        </span>
        <span className="h-px flex-1 bg-rule" />
      </div>

      <ul className="mt-6 grid gap-px border border-rule bg-rule sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => (
          <li key={category.id}>
            <Link
              href={`/wiki/${category.id}`}
              className="flex h-full flex-col bg-paper-raised px-5 py-5 transition-colors hover:bg-ink hover:text-paper"
            >
              <span className="text-lg uppercase leading-tight tracking-tight">
                {category.name}
              </span>
              <span className="mt-2 line-clamp-3 text-xs leading-relaxed opacity-70">
                {category.blurb}
              </span>
              <span className="mt-auto pt-4 text-xs opacity-50">
                {category.exemplars.slice(0, 2).join(" · ")}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
