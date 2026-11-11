import { Placeholder } from '@/components/Placeholder';
import { t } from '@/i18n';

/** S-02 — see product.md. Placeholder until the Hi-Fi mockup arrives. */
export default function IndexScreen() {
  return (
    <Placeholder
      modal={false}
      code="S-02"
      title={t("tabs.home")}
      links={[
        { label: "− Expense", href: "/capture?type=expense" },
        { label: "+ Income", href: "/capture?type=income" },
        { label: "Start trip", href: "/trip/active" },
        { label: "Settings", href: "/settings" },
      ]}
    />
  );
}
