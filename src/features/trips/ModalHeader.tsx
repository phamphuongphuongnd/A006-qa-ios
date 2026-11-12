import type { LucideIcon } from '@/ui/icons';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { GUTTER } from '@/theme';
import { IconButton, Txt } from '@/ui';

/** Mockup modal top bar: icon button left, centred h3 title (or custom node), balancing slot right. */
export function ModalHeader({
  icon,
  iconLabel,
  onIcon,
  title,
  center,
  right,
}: {
  icon?: LucideIcon;
  iconLabel?: string;
  onIcon?: () => void;
  title?: string;
  center?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: GUTTER - 8, paddingTop: 8, minHeight: 60 }}>
      <View style={{ width: 48 }}>{icon ? <IconButton icon={icon} label={iconLabel ?? ''} onPress={onIcon} /> : null}</View>
      <View style={{ flex: 1, alignItems: 'center' }}>
        {center ?? (title ? (
          <Txt v="h3" accessibilityRole="header" numberOfLines={1}>
            {title}
          </Txt>
        ) : null)}
      </View>
      <View style={{ minWidth: 48, alignItems: 'flex-end' }}>{right}</View>
    </View>
  );
}
