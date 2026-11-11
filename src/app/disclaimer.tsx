import { Placeholder } from '@/components/Placeholder';
import { t } from '@/i18n';

/** S-16 — see product.md. Placeholder until the Hi-Fi mockup arrives. */
export default function DisclaimerScreen() {
  return (
    <Placeholder
      code="S-16"
      title={t("disclaimer.title")}
    />
  );
}
