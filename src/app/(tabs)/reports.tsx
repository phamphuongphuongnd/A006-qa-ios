import { Placeholder } from '@/components/Placeholder';
import { t } from '@/i18n';

/** S-09 — see product.md. Placeholder until the Hi-Fi mockup arrives. */
export default function ReportsScreen() {
  return (
    <Placeholder
      modal={false}
      code="S-09"
      title={t("reports.title")}
      links={[
        { label: "Export", href: "/export" },
      ]}
    />
  );
}
