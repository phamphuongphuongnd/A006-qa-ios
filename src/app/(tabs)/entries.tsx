import { Placeholder } from '@/components/Placeholder';
import { t } from '@/i18n';

/** S-04 — see product.md. Placeholder until the Hi-Fi mockup arrives. */
export default function EntriesScreen() {
  return (
    <Placeholder
      code="S-04"
      title={t("tabs.entries")}
      links={[
        { label: "Entry detail (demo)", href: "/entry/demo" },
      ]}
    />
  );
}
