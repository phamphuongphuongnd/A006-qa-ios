import { Placeholder } from '@/components/Placeholder';
import { t } from '@/i18n';

/** S-13 — see product.md. Placeholder until the Hi-Fi mockup arrives. */
export default function LockedScreen() {
  return (
    <Placeholder
      code="S-13"
      title={t("screens.locked")}
    />
  );
}
