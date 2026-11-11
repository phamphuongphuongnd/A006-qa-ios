import { Placeholder } from '@/components/Placeholder';
import { t } from '@/i18n';

/** S-07 — see product.md. Placeholder until the Hi-Fi mockup arrives. */
export default function MilesScreen() {
  return (
    <Placeholder
      modal={false}
      code="S-07"
      title={t("miles.title")}
      links={[
        { label: "Start trip", href: "/trip/active" },
        { label: "Add manually", href: "/trip/new" },
        { label: "Location access", href: "/trip/permission" },
      ]}
    />
  );
}
