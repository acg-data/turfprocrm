import { MarketingNav } from "./chrome";
import { Footer } from "./footer";
import { Reveal } from "./reveal";
import shell from "./turf-pro-marketing.module.css";
import styles from "./legal-page.module.css";

export type LegalSection = {
  title: string;
  paragraphs: string[];
  bullets?: string[];
};

export function LegalPage({
  title,
  accent,
  updated,
  intro,
  sections,
}: {
  title: string;
  accent: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
}) {
  return (
    <main className={shell.site}>
      <MarketingNav />
      <header className={styles.legalHero}>
        <div className={shell.wrap}>
          <Reveal immediate>
            <h1 className={styles.legalTitle}>
              {title} <span>{accent}</span>
            </h1>
            <p className={styles.updated}>Last updated {updated}</p>
          </Reveal>
        </div>
      </header>
      <article className={styles.legalBody}>
        <p className={styles.intro}>{intro}</p>
        {sections.map((section) => (
          <section className={styles.section} key={section.title}>
            <h2>{section.title}</h2>
            {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            {section.bullets ? <ul>{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul> : null}
          </section>
        ))}
      </article>
      <Footer year={new Date().getFullYear()} />
    </main>
  );
}

