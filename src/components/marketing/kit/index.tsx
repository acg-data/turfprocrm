import type { CSSProperties, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Check, Minus, X } from "lucide-react";
import { Reveal, Stagger, StaggerItem } from "../reveal";
import hm from "../home.module.css";
import shell from "../turf-pro-marketing.module.css";
import kit from "./marketing-kit.module.css";

export function SectionHead({
  kicker,
  title,
  accent,
  lede,
  align = "center",
}: {
  kicker: string;
  title: string;
  accent?: string;
  lede?: string;
  align?: "center" | "left";
}) {
  return (
    <Reveal>
      <div className={hm.sectionHead} style={align === "left" ? { textAlign: "left", marginInline: 0 } : undefined}>
        <p className={hm.kicker}>{kicker}</p>
        <h2 className={hm.sectionTitle}>
          {title} {accent ? <em>{accent}</em> : null}
        </h2>
        {lede ? <p className={hm.sectionLede}>{lede}</p> : null}
      </div>
    </Reveal>
  );
}

export type IconColumnItem = {
  icon: LucideIcon;
  title: string;
  body: string;
};

export function IconColumns({ cols, items }: { cols: number; items: IconColumnItem[] }) {
  return (
    <Stagger className={hm.iconCols} style={{ "--cols": cols } as CSSProperties}>
      {items.map(({ icon: Icon, title, body }) => (
        <StaggerItem key={title} className={hm.iconCol}>
          <span className={hm.iconColIcon}>
            <Icon />
          </span>
          <h3>{title}</h3>
          <p>{body}</p>
        </StaggerItem>
      ))}
    </Stagger>
  );
}

export type StatItem = { icon: LucideIcon; value: string; label: string };

export function StatBand({ title, accent, stats }: { title: string; accent: string; stats: StatItem[] }) {
  return (
    <section className={hm.statsBand}>
      <div className={shell.wrap}>
        <Reveal>
          <h2 className={hm.statsBandTitle}>
            {title} <em>{accent}</em>
          </h2>
        </Reveal>
        <Stagger className={hm.statsGrid}>
          {stats.map(({ icon: Icon, value, label }) => (
            <StaggerItem key={label} className={hm.statBlock}>
              <Icon size={26} />
              <span className={hm.statValue}>{value}</span>
              <span className={hm.statLabel}>{label}</span>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

export type FloatingChipItem = {
  icon: LucideIcon;
  title: string;
  sub: string;
  style: CSSProperties;
};

export function FloatingChips({ items }: { items: FloatingChipItem[] }) {
  return items.map(({ icon: Icon, title, sub, style }) => (
    <div key={title} className={hm.floatChip} style={style}>
      <span className={hm.floatChipIcon}>
        <Icon size={16} />
      </span>
      <span>
        <strong>{title}</strong>
        <small>{sub}</small>
      </span>
    </div>
  ));
}

export type FeatureTableRow = { feature: string; us: boolean | string; them: boolean | string };

function FeatureValue({ value }: { value: boolean | string }) {
  if (value === true) return <Check className={kit.positive} aria-label="Included" size={19} />;
  if (value === false) return <X className={kit.negative} aria-label="Not included" size={19} />;
  if (!value) return <Minus aria-label="Not available" size={19} />;
  return <>{value}</>;
}

export function FeatureTable({
  us,
  them,
  rows,
}: {
  us: string;
  them: string;
  rows: FeatureTableRow[];
}) {
  return (
    <div className={kit.featureTableWrap}>
      <table className={kit.featureTable}>
        <thead>
          <tr>
            <th scope="col">Capability</th>
            <th scope="col">{us}</th>
            <th scope="col">{them}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.feature}>
              <td>{row.feature}</td>
              <td><FeatureValue value={row.us} /></td>
              <td><FeatureValue value={row.them} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function MarketingSurface({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
