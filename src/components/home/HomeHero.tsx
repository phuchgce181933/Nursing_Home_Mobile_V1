import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { shadeColor } from '../../theme/theme';
import { AvatarCircle } from '../shared/AvatarCircle';
import { COLORS, SPACING } from '../../theme/designSystem';

type Props = {
  greeting: string;
  subtitle?: string;
  avatarName: string;
  avatarUri?: string | null;
  unreadCount?: number;
  onPressNotifications?: () => void;
  onPressProfile?: () => void;
  roleColor?: string;
  // Extra bottom padding so floating summary cards (rendered by the screen, just
  // below this component) can overlap the curved edge without covering content.
  overlapSpace?: number;
};

// The one shared hero header used by every role's Home screen — only the
// greeting/subtitle/avatar content changes per role, the shape stays identical.
export const HomeHero: React.FC<Props> = ({
  greeting,
  subtitle,
  avatarName,
  avatarUri,
  unreadCount = 0,
  onPressNotifications,
  onPressProfile,
  roleColor = COLORS.primary,
  overlapSpace = 56,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={[shadeColor(roleColor, -20), roleColor, shadeColor(roleColor, 18)]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.container, { paddingTop: insets.top + SPACING.md, paddingBottom: overlapSpace }]}
    >
      {/* Very subtle decorative background — kept low-opacity so it never competes
          with the greeting/actions above it. */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View style={styles.blobLarge} />
        <View style={styles.blobSmall} />
        <MaterialCommunityIcons name="leaf" size={90} color="#FFFFFF" style={styles.leafIcon} />
        <MaterialCommunityIcons name="heart-pulse" size={64} color="#FFFFFF" style={styles.pulseIcon} />
      </View>

      <View style={styles.topRow}>
        <Pressable onPress={onPressProfile} style={styles.identityRow} hitSlop={6}>
          <AvatarCircle name={avatarName} size={44} uri={avatarUri} />
          <View style={styles.identityText}>
            <Text style={styles.greeting} numberOfLines={1}>{greeting}</Text>
            {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
          </View>
        </Pressable>

        <Pressable onPress={onPressNotifications} style={styles.bellWrap} hitSlop={8}>
          <MaterialCommunityIcons name="bell-outline" size={22} color="#FFFFFF" />
          {unreadCount > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.md,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    overflow: 'hidden',
  },
  blobLarge: {
    position: 'absolute', top: -70, right: -60, width: 200, height: 200,
    borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.07)',
  },
  blobSmall: {
    position: 'absolute', bottom: -40, left: -30, width: 130, height: 130,
    borderRadius: 65, backgroundColor: 'rgba(255,255,255,0.06)',
  },
  leafIcon: { position: 'absolute', top: 6, right: 70, opacity: 0.08, transform: [{ rotate: '18deg' }] },
  pulseIcon: { position: 'absolute', bottom: -10, left: 90, opacity: 0.07 },

  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, flex: 1, marginRight: SPACING.sm },
  identityText: { flex: 1 },
  greeting: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  subtitle: { color: 'rgba(255,255,255,0.78)', fontSize: 12.5, marginTop: 2 },

  bellWrap: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center', justifyContent: 'center',
  },
  badge: {
    position: 'absolute', top: -2, right: -2,
    minWidth: 17, height: 17, borderRadius: 9,
    backgroundColor: COLORS.danger, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3, borderWidth: 1.5, borderColor: '#FFFFFF',
  },
  badgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '700' },
});
