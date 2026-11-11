import { Placeholder } from '@/components/Placeholder';
import { t } from '@/i18n';

/** S-15 — see product.md. Placeholder until the Hi-Fi mockup arrives. */
export default function SettingsScreen() {
  return (
    <Placeholder
      code="S-15"
      title={t("screens.settings")}
      links={[
        { label: "Categories", href: "/categories" },
        { label: "Backup & restore", href: "/backup" },
        { label: "Export", href: "/export" },
        { label: "Not tax advice", href: "/disclaimer" },
        { label: "Locked screen", href: "/locked" },
      ]}
    />
  );
}
