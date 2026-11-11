import { Link, type Href } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { t } from '@/i18n';
import { radius, spacing, touch, type, useTheme } from '@/theme';

/**
 * Stand-in for screens until the Hi-Fi mockup arrives. Shows the product.md screen code so the
 * route map can be clicked through on a device.
 */
export function Placeholder({ code, title, links = [] }: { code: string; title: string; links?: { label: string; href: Href }[] }) {
  const { colors } = useTheme();
  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.wrap}>
      <Text style={[type.caption, { color: colors.textMuted }]}>{code}</Text>
      <Text style={[type.title, { color: colors.text }]} accessibilityRole="header">
        {title}
      </Text>
      <Text style={[type.body, { color: colors.textMuted }]}>{t('common.comingFromMockup')}</Text>
      <View style={styles.links}>
        {links.map((l) => (
          <Link key={l.label} href={l.href} style={[styles.link, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}>
            {l.label}
          </Link>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: spacing.lg, gap: spacing.sm },
  links: { marginTop: spacing.md, gap: spacing.sm },
  link: {
    minHeight: touch.min,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderRadius: radius.field,
    borderWidth: 1,
    fontSize: 16,
  },
});
