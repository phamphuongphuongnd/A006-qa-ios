import { Placeholder } from '@/components/Placeholder';
import { t } from '@/i18n';

/** S-07b — see product.md. Placeholder until the Hi-Fi mockup arrives. */
export default function ActiveScreen() {
  return (
    <Placeholder
      code="S-07b"
      title={t("screens.tripActive")}
    />
  );
}
