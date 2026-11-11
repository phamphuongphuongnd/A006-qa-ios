import { Placeholder } from '@/components/Placeholder';
import { t } from '@/i18n';

/** S-06 — see product.md. Placeholder until the Hi-Fi mockup arrives. */
export default function SortScreen() {
  return (
    <Placeholder
      code="S-06"
      title={t("sort.title")}
      links={[
        { label: "List view", href: "/sort-list" },
        { label: "Split (demo)", href: "/split/demo" },
        { label: "Done", href: "/sort-done" },
      ]}
    />
  );
}
