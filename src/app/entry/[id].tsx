import { Placeholder } from '@/components/Placeholder';
import { t } from '@/i18n';

/** S-05 — see product.md. Placeholder until the Hi-Fi mockup arrives. */
export default function IdScreen() {
  return (
    <Placeholder
      code="S-05"
      title={t("screens.entry")}
      links={[
        { label: "Split", href: "/split/demo" },
      ]}
    />
  );
}
