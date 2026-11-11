import { Placeholder } from '@/components/Placeholder';
import { t } from '@/i18n';

/** S-08 — see product.md. Placeholder until the Hi-Fi mockup arrives. */
export default function NewScreen() {
  return (
    <Placeholder
      code="S-08"
      title={t("screens.tripNew")}
    />
  );
}
