import { router, type Href } from 'expo-router';
import { X } from '@/ui/icons';

import { t } from '@/i18n';
import { Button, IconButton, Screen, Txt } from '@/ui';

/**
 * Stand-in for screens not built yet. Shows the product.md screen code so the route map can be clicked
 * through on a device.
 */
export function Placeholder({ code, title, links = [], modal }: { code: string; title: string; links?: { label: string; href: string }[]; modal?: boolean }) {
  return (
    <Screen
      title={title}
      headerRight={modal !== false ? <IconButton icon={X} label="Close" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} /> : undefined}>
      <Txt v="caption" c="textTertiary">
        {code}
      </Txt>
      <Txt c="textSecondary">{t('common.comingFromMockup')}</Txt>
      {links.map((l) => (
        <Button key={l.label} label={l.label} variant="outline" onPress={() => router.push(l.href as Href)} />
      ))}
    </Screen>
  );
}
