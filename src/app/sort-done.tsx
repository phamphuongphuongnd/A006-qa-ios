import { Placeholder } from '@/components/Placeholder';
import { t } from '@/i18n';

/** S-06c — see product.md. Placeholder until the Hi-Fi mockup arrives. */
export default function SortdoneScreen() {
  return (
    <Placeholder
      code="S-06c"
      title={t("screens.sortDone")}
      links={[
        { label: "Back up now", href: "/backup" },
      ]}
    />
  );
}
