import { useMemo, useState } from "react";
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View
} from "react-native";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";

import metadata from "./metadata.json";
import { audio, images } from "./assets";

const palette = {
  ink: "#f5eee5",
  muted: "#aa9b91",
  faint: "#72645d",
  background: "#100b0b",
  surface: "#181010",
  elevated: "#211515",
  line: "#362424",
  red: "#e4473e",
  redDark: "#7d201d",
  gold: "#e8bd68"
};

const typeNames = Object.fromEntries(metadata.types.map((type) => [type.id, type.name]));

function formatTime(value) {
  const safeValue = Number.isFinite(value) ? Math.max(0, value) : 0;
  const minutes = Math.floor(safeValue / 60);
  const seconds = Math.floor(safeValue % 60);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function BrandMark() {
  return (
    <View style={styles.brandMark}>
      <View style={styles.brandMarkCore} />
      <View style={[styles.brandMarkRay, styles.brandMarkRayVertical]} />
      <View style={styles.brandMarkRay} />
    </View>
  );
}

function TrackCard({ item, width, active, playing, onPress }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${playing && active ? "Pause" : "Play"} ${item.name}`}
      onPress={onPress}
      style={({ pressed, hovered }) => [
        styles.card,
        { width },
        active && styles.cardActive,
        (pressed || hovered) && styles.cardHovered
      ]}
    >
      <View style={styles.artworkFrame}>
        <Image source={images[item.id]} style={styles.artwork} resizeMode="cover" />
        <View style={styles.cardShade} />
        <View style={[styles.playBadge, active && styles.playBadgeActive]}>
          <Text style={styles.playBadgeText}>{playing && active ? "Ⅱ" : "▶"}</Text>
        </View>
        {active ? (
          <View style={styles.liveTag}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>{playing ? "PLAYING" : "PAUSED"}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.cardDetails}>
        <Text numberOfLines={1} style={styles.cardTitle}>{item.name}</Text>
        <Text numberOfLines={1} style={styles.cardType}>{typeNames[item.type]}</Text>
      </View>
    </Pressable>
  );
}

function PlayerButton({ label, onPress, primary = false, disabled = false }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed, hovered }) => [
        styles.playerButton,
        primary && styles.playerButtonPrimary,
        disabled && styles.playerButtonDisabled,
        (pressed || hovered) && !disabled && styles.playerButtonHovered
      ]}
    >
      <Text style={[styles.playerButtonText, primary && styles.playerButtonTextPrimary]}>
        {label}
      </Text>
    </Pressable>
  );
}

function NowPlaying({ item, status, onToggle, onPrevious, onNext, onSeek, compact }) {
  const [progressWidth, setProgressWidth] = useState(1);
  const duration = status.duration || 0;
  const progress = duration > 0 ? Math.min(1, status.currentTime / duration) : 0;

  return (
    <View style={[styles.playerShell, compact && styles.playerShellCompact]}>
      <View style={styles.playerInner}>
        <View style={styles.nowPlayingIdentity}>
          {item ? (
            <Image source={images[item.id]} style={styles.playerArtwork} />
          ) : (
            <View style={[styles.playerArtwork, styles.playerArtworkEmpty]}>
              <Text style={styles.playerArtworkEmptyIcon}>⌁</Text>
            </View>
          )}
          <View style={styles.playerCopy}>
            <Text style={styles.playerEyebrow}>{item ? "NOW PLAYING" : "SOUND ARCHIVE"}</Text>
            <Text numberOfLines={1} style={styles.playerTitle}>
              {item ? item.name : "Select an artifact to begin"}
            </Text>
            <Text numberOfLines={1} style={styles.playerSubtitle}>
              {item ? typeNames[item.type] : `${metadata.items.length} recovered recordings`}
            </Text>
          </View>
        </View>

        <View style={[styles.transport, compact && styles.transportCompact]}>
          <View style={styles.transportButtons}>
            <PlayerButton label="‹" onPress={onPrevious} disabled={!item} />
            <PlayerButton
              label={status.playing ? "Ⅱ" : "▶"}
              onPress={onToggle}
              primary
              disabled={!item}
            />
            <PlayerButton label="›" onPress={onNext} disabled={!item} />
          </View>
          <View style={styles.timelineRow}>
            <Text style={styles.timeText}>{formatTime(status.currentTime)}</Text>
            <Pressable
              accessibilityRole="adjustable"
              accessibilityLabel="Playback position"
              disabled={!item || !duration}
              onLayout={(event) => setProgressWidth(event.nativeEvent.layout.width)}
              onPress={(event) => onSeek((event.nativeEvent.locationX / progressWidth) * duration)}
              style={styles.timeline}
            >
              <View style={[styles.timelineFill, { width: `${progress * 100}%` }]} />
              <View style={[styles.timelineThumb, { left: `${progress * 100}%` }]} />
            </Pressable>
            <Text style={styles.timeText}>{formatTime(duration)}</Text>
          </View>
        </View>

        {!compact ? (
          <View style={styles.playerMeta}>
            <Text style={styles.playerMetaIcon}>◖))</Text>
            <Text style={styles.playerMetaText}>ARCHIVE AUDIO</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

export default function App() {
  const { width } = useWindowDimensions();
  const [query, setQuery] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [currentItem, setCurrentItem] = useState(null);
  const player = useAudioPlayer(null, { updateInterval: 100 });
  const status = useAudioPlayerStatus(player);

  const compact = width < 760;
  const pagePadding = width < 520 ? 18 : width < 900 ? 28 : 42;
  const availableWidth = Math.min(width - pagePadding * 2, 1280);
  const columns = width < 410 ? 1 : width < 700 ? 2 : width < 980 ? 3 : width < 1220 ? 4 : 5;
  const gap = width < 520 ? 12 : 18;
  const cardWidth = Math.floor((availableWidth - gap * (columns - 1)) / columns);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return metadata.items.filter((item) => {
      const matchesType = selectedType === "all" || item.type === selectedType;
      const matchesQuery = !normalizedQuery ||
        item.name.toLowerCase().includes(normalizedQuery) ||
        typeNames[item.type].toLowerCase().includes(normalizedQuery);
      return matchesType && matchesQuery;
    });
  }, [query, selectedType]);

  const playItem = (item) => {
    if (currentItem?.id === item.id) {
      if (status.playing) {
        player.pause();
      } else {
        if (status.duration && status.currentTime >= status.duration - 0.05) {
          player.seekTo(0);
        }
        player.play();
      }
      return;
    }

    player.pause();
    player.replace(audio[item.id]);
    setCurrentItem(item);
    player.play();
  };

  const moveTrack = (offset) => {
    if (!currentItem) return;
    const currentIndex = metadata.items.findIndex((item) => item.id === currentItem.id);
    const nextIndex = (currentIndex + offset + metadata.items.length) % metadata.items.length;
    playItem(metadata.items[nextIndex]);
  };

  return (
    <View style={styles.app}>
      <StatusBar barStyle="light-content" backgroundColor={palette.background} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: pagePadding }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.page, { maxWidth: 1280 }]}>
          <View style={styles.nav}>
            <View style={styles.brand}>
              <BrandMark />
              <View>
                <Text style={styles.brandName}>ABI ARCHIVE</Text>
                <Text style={styles.brandSub}>ANOMALOUS BROADCAST INDEX</Text>
              </View>
            </View>
            <View style={styles.navStatus}>
              <View style={styles.statusDot} />
              <Text style={styles.navStatusText}>ARCHIVE ONLINE</Text>
            </View>
          </View>

          <View style={[styles.hero, compact && styles.heroCompact]}>
            <View style={styles.heroCopy}>
              <View style={styles.eyebrowRow}>
                <View style={styles.eyebrowLine} />
                <Text style={styles.eyebrow}>RED COLLECTION / AUDIO RECORDS</Text>
              </View>
              <Text style={[styles.heroTitle, compact && styles.heroTitleCompact]}>
                Sounds from the{"\n"}<Text style={styles.heroTitleAccent}>other side.</Text>
              </Text>
              <Text style={styles.heroBody}>
                Browse recovered artifacts and listen to their preserved audio signatures.
                Headphones recommended.
              </Text>
            </View>
            {!compact ? (
              <View style={styles.heroCount}>
                <Text style={styles.heroCountNumber}>{String(metadata.items.length).padStart(2, "0")}</Text>
                <Text style={styles.heroCountLabel}>RECORDINGS</Text>
                <View style={styles.heroCountRule} />
                <Text style={styles.heroCountMeta}>RARITY / {metadata.rarity.toUpperCase()}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.tools}>
            <View style={styles.searchBox}>
              <Text style={styles.searchIcon}>⌕</Text>
              <TextInput
                accessibilityLabel="Search archive"
                value={query}
                onChangeText={setQuery}
                placeholder="Search the archive"
                placeholderTextColor={palette.faint}
                selectionColor={palette.red}
                style={styles.searchInput}
              />
              {query ? (
                <Pressable accessibilityLabel="Clear search" onPress={() => setQuery("")}>
                  <Text style={styles.clearSearch}>×</Text>
                </Pressable>
              ) : null}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
              {[{ id: "all", name: "All" }, ...metadata.types].map((type) => {
                const active = selectedType === type.id;
                return (
                  <Pressable
                    key={type.id}
                    onPress={() => setSelectedType(type.id)}
                    style={({ pressed, hovered }) => [
                      styles.filterChip,
                      active && styles.filterChipActive,
                      (pressed || hovered) && styles.filterChipHovered
                    ]}
                  >
                    <Text style={[styles.filterText, active && styles.filterTextActive]}>{type.name}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>ARCHIVE INDEX</Text>
            <Text style={styles.resultCount}>{filteredItems.length} ENTRIES</Text>
          </View>

          {filteredItems.length ? (
            <View style={[styles.grid, { gap }]}>
              {filteredItems.map((item) => (
                <TrackCard
                  key={item.id}
                  item={item}
                  width={cardWidth}
                  active={currentItem?.id === item.id}
                  playing={status.playing}
                  onPress={() => playItem(item)}
                />
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyGlyph}>∅</Text>
              <Text style={styles.emptyTitle}>NO SIGNAL FOUND</Text>
              <Text style={styles.emptyBody}>Try another search or collection filter.</Text>
            </View>
          )}

          <View style={styles.footer}>
            <Text style={styles.footerText}>ABI / RED ARCHIVE / {new Date().getFullYear()}</Text>
            <Text style={styles.footerText}>SIGNAL INTEGRITY: STABLE</Text>
          </View>
        </View>
      </ScrollView>

      <NowPlaying
        item={currentItem}
        status={status}
        compact={compact}
        onToggle={() => currentItem && playItem(currentItem)}
        onPrevious={() => moveTrack(-1)}
        onNext={() => moveTrack(1)}
        onSeek={(seconds) => player.seekTo(seconds)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: palette.background },
  scrollView: { flex: 1 },
  scrollContent: { alignItems: "center" },
  page: { width: "100%" },
  nav: {
    minHeight: 88,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: palette.line
  },
  brand: { flexDirection: "row", alignItems: "center", gap: 13 },
  brandMark: {
    width: 34,
    height: 34,
    borderWidth: 1,
    borderColor: palette.red,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "45deg" }]
  },
  brandMarkCore: { width: 9, height: 9, backgroundColor: palette.red },
  brandMarkRay: { position: "absolute", width: 42, height: 1, backgroundColor: palette.redDark },
  brandMarkRayVertical: { transform: [{ rotate: "90deg" }] },
  brandName: { color: palette.ink, fontSize: 14, fontWeight: "800", letterSpacing: 2.2 },
  brandSub: { color: palette.faint, fontSize: 8, fontWeight: "700", letterSpacing: 1.4, marginTop: 4 },
  navStatus: { flexDirection: "row", alignItems: "center", gap: 8 },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: palette.red },
  navStatusText: { color: palette.muted, fontSize: 9, fontWeight: "700", letterSpacing: 1.5 },
  hero: {
    minHeight: 375,
    paddingVertical: 68,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between"
  },
  heroCompact: { minHeight: 330, paddingVertical: 52 },
  heroCopy: { flex: 1, maxWidth: 730 },
  eyebrowRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 22 },
  eyebrowLine: { width: 28, height: 1, backgroundColor: palette.red },
  eyebrow: { color: palette.red, fontSize: 10, fontWeight: "800", letterSpacing: 2 },
  heroTitle: {
    color: palette.ink,
    fontSize: 64,
    lineHeight: 68,
    fontWeight: "300",
    letterSpacing: -2.8
  },
  heroTitleCompact: { fontSize: 43, lineHeight: 47, letterSpacing: -1.8 },
  heroTitleAccent: { color: palette.red, fontStyle: "italic" },
  heroBody: { color: palette.muted, maxWidth: 520, fontSize: 15, lineHeight: 24, marginTop: 24 },
  heroCount: { width: 180, alignItems: "flex-end", paddingBottom: 8 },
  heroCountNumber: { color: palette.ink, fontSize: 58, lineHeight: 62, fontWeight: "200", letterSpacing: -3 },
  heroCountLabel: { color: palette.red, fontSize: 9, fontWeight: "800", letterSpacing: 2.4, marginTop: 4 },
  heroCountRule: { width: "100%", height: 1, backgroundColor: palette.line, marginVertical: 18 },
  heroCountMeta: { color: palette.faint, fontSize: 9, fontWeight: "700", letterSpacing: 1.4 },
  tools: { gap: 18, marginBottom: 42 },
  searchBox: {
    height: 52,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.surface,
    borderRadius: 4,
    paddingHorizontal: 17,
    flexDirection: "row",
    alignItems: "center"
  },
  searchIcon: { color: palette.red, fontSize: 25, marginRight: 11, marginTop: -3 },
  searchInput: {
    flex: 1,
    height: "100%",
    color: palette.ink,
    fontSize: 14,
    outlineStyle: "none"
  },
  clearSearch: { color: palette.muted, fontSize: 25, paddingHorizontal: 5 },
  filters: { gap: 9, paddingRight: 12 },
  filterChip: {
    height: 34,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.surface,
    cursor: "pointer"
  },
  filterChipActive: { backgroundColor: palette.red, borderColor: palette.red },
  filterChipHovered: { borderColor: palette.red },
  filterText: { color: palette.muted, fontSize: 10, fontWeight: "700", letterSpacing: 0.8 },
  filterTextActive: { color: "#fff8f2" },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: palette.line,
    marginBottom: 22
  },
  sectionTitle: { color: palette.ink, fontSize: 12, fontWeight: "800", letterSpacing: 2 },
  resultCount: { color: palette.faint, fontSize: 9, fontWeight: "700", letterSpacing: 1.4 },
  grid: { flexDirection: "row", flexWrap: "wrap", alignItems: "flex-start" },
  card: {
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 3,
    overflow: "hidden",
    cursor: "pointer",
    ...Platform.select({
      web: { transitionDuration: "160ms", transitionProperty: "transform, border-color, box-shadow" }
    })
  },
  cardHovered: {
    transform: [{ translateY: -4 }],
    borderColor: "#68403d",
    ...Platform.select({ web: { boxShadow: "0 14px 36px rgba(0,0,0,0.35)" } })
  },
  cardActive: { borderColor: palette.red },
  artworkFrame: { width: "100%", aspectRatio: 255 / 336, backgroundColor: palette.elevated },
  artwork: { width: "100%", height: "100%" },
  cardShade: { position: "absolute", left: 0, right: 0, bottom: 0, height: 88, backgroundColor: "rgba(10,4,4,0.18)" },
  playBadge: {
    position: "absolute",
    right: 12,
    bottom: 12,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(15,9,9,0.88)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center"
  },
  playBadgeActive: { backgroundColor: palette.red, borderColor: palette.red },
  playBadgeText: { color: "#fff", fontSize: 13, marginLeft: 2, fontWeight: "800" },
  liveTag: {
    position: "absolute",
    left: 10,
    top: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    height: 23,
    borderRadius: 2,
    backgroundColor: "rgba(12,7,7,0.9)"
  },
  liveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: palette.red },
  liveText: { color: palette.ink, fontSize: 7, fontWeight: "800", letterSpacing: 1.1 },
  cardDetails: { paddingHorizontal: 13, paddingVertical: 14, gap: 6 },
  cardTitle: { color: palette.ink, fontSize: 13, fontWeight: "700" },
  cardType: { color: palette.faint, fontSize: 9, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase" },
  emptyState: { height: 300, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: palette.line },
  emptyGlyph: { color: palette.red, fontSize: 38, fontWeight: "200" },
  emptyTitle: { color: palette.ink, fontSize: 12, fontWeight: "800", letterSpacing: 2, marginTop: 12 },
  emptyBody: { color: palette.faint, fontSize: 12, marginTop: 8 },
  footer: {
    minHeight: 110,
    marginTop: 65,
    paddingVertical: 30,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: palette.line
  },
  footerText: { color: palette.faint, fontSize: 8, fontWeight: "700", letterSpacing: 1.3 },
  playerShell: {
    minHeight: 106,
    backgroundColor: "#160e0e",
    borderTopWidth: 1,
    borderTopColor: "#492624",
    paddingHorizontal: 34,
    paddingVertical: 13,
    ...Platform.select({ web: { boxShadow: "0 -12px 34px rgba(0,0,0,0.28)" } })
  },
  playerShellCompact: { minHeight: 164, paddingHorizontal: 18, paddingVertical: 12 },
  playerInner: {
    width: "100%",
    maxWidth: 1280,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 14
  },
  nowPlayingIdentity: { flexDirection: "row", alignItems: "center", width: 310, minWidth: 250 },
  playerArtwork: { width: 58, height: 74, borderRadius: 2, backgroundColor: palette.elevated },
  playerArtworkEmpty: { alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: palette.line },
  playerArtworkEmptyIcon: { color: palette.red, fontSize: 26 },
  playerCopy: { flex: 1, marginLeft: 14 },
  playerEyebrow: { color: palette.red, fontSize: 8, fontWeight: "800", letterSpacing: 1.5, marginBottom: 6 },
  playerTitle: { color: palette.ink, fontSize: 14, fontWeight: "700" },
  playerSubtitle: { color: palette.faint, fontSize: 10, marginTop: 5 },
  transport: { flex: 1, maxWidth: 520, minWidth: 320, alignItems: "center", gap: 10 },
  transportCompact: { order: 3, minWidth: "100%", maxWidth: "100%" },
  transportButtons: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12 },
  playerButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer"
  },
  playerButtonPrimary: { width: 42, height: 42, borderRadius: 21, backgroundColor: palette.ink },
  playerButtonHovered: { opacity: 0.72 },
  playerButtonDisabled: { opacity: 0.28, cursor: "default" },
  playerButtonText: { color: palette.ink, fontSize: 27, fontWeight: "300", lineHeight: 30 },
  playerButtonTextPrimary: { color: palette.background, fontSize: 13, fontWeight: "900", marginLeft: 1 },
  timelineRow: { width: "100%", flexDirection: "row", alignItems: "center", gap: 10 },
  timeline: { flex: 1, height: 14, justifyContent: "center", cursor: "pointer" },
  timelineFill: { position: "absolute", left: 0, height: 2, backgroundColor: palette.red },
  timelineThumb: { position: "absolute", width: 8, height: 8, marginLeft: -4, borderRadius: 4, backgroundColor: palette.red },
  timeText: { width: 32, color: palette.faint, fontSize: 9, fontVariant: ["tabular-nums"] },
  playerMeta: { width: 160, alignItems: "flex-end" },
  playerMetaIcon: { color: palette.red, fontSize: 15, marginBottom: 7 },
  playerMetaText: { color: palette.faint, fontSize: 8, fontWeight: "800", letterSpacing: 1.3 }
});
