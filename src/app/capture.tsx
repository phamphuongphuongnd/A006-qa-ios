import { Placeholder } from '@/components/Placeholder';
import { t } from '@/i18n';

/** S-03 — see product.md. Placeholder until the Hi-Fi mockup arrives. */
export default function CaptureScreen() {
  return (
    <Placeholder
      code="S-03"
      title={t("screens.capture")}
    />
  );
}
