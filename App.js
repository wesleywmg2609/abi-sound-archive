import { useEffect, useMemo, useState } from "react";
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
import { images, sounds } from "./asset-map";

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

const soundGroups = [...new Set(metadata.items.map((item) => item.audio))]
  .sort((a, b) => Number(a) - Number(b));
const typesById = Object.fromEntries(metadata.types.map((type) => [type.id, type]));
const itemSizes = [...new Map(metadata.items.map((item) => {
  const id = `${item.size.width}x${item.size.height}`;
  return [id, { id, name: `${item.size.width} × ${item.size.height}` }];
})).values()].sort((a, b) => {
  const [aWidth, aHeight] = a.id.split("x").map(Number);
  const [bWidth, bHeight] = b.id.split("x").map(Number);
  return aWidth - bWidth || aHeight - bHeight;
});
const translations = {
  en: {
    brandSub: "ANOMALOUS BROADCAST INDEX",
    archiveOnline: "ARCHIVE ONLINE",
    collectionLabel: "RED COLLECTION / SOUND GROUPS",
    heroLead: "Sounds from the",
    heroAccent: "other side.",
    heroBody: "Browse recovered artifacts and preview their pickup and drop sounds. Headphones recommended.",
    artifacts: "ARTIFACTS",
    soundGroups: "SOUND GROUPS",
    rarity: "RED",
    searchLabel: "Search archive",
    searchPlaceholder: "Search the archive",
    clearSearch: "Clear search",
    category: "CATEGORY",
    sound: "Sound",
    size: "Size",
    allCategories: "All Categories",
    allSounds: "All Sounds",
    allSizes: "All Sizes",
    group: "Group",
    archiveIndex: "ARCHIVE INDEX",
    entries: "ENTRIES",
    noSignal: "NO SIGNAL FOUND",
    emptyHint: "Try another search or collection filter.",
    signalStable: "SIGNAL INTEGRITY: STABLE",
    redArchive: "RED ARCHIVE",
    nowPlaying: "NOW PLAYING",
    soundArchive: "SOUND ARCHIVE",
    selectArtifact: "Select an artifact to begin",
    playbackPosition: "Playback position",
    volume: "Volume",
    pickupDropAudio: "PICKUP / DROP AUDIO",
    playing: "PLAYING",
    paused: "PAUSED",
    actions: { up: "Pick up", down: "Drop" }
  },
  cn: {
    brandSub: "异常广播索引",
    archiveOnline: "档案在线",
    collectionLabel: "红色收藏 / 声音组",
    heroLead: "来自另一边的",
    heroAccent: "声音。",
    heroBody: "浏览回收的物品，并试听它们的拾取与放下音效。建议佩戴耳机。",
    artifacts: "件物品",
    soundGroups: "个声音组",
    rarity: "红色",
    searchLabel: "搜索档案",
    searchPlaceholder: "搜索档案",
    clearSearch: "清除搜索",
    category: "类别",
    sound: "声音",
    size: "尺寸",
    allCategories: "所有类别",
    allSounds: "所有声音",
    allSizes: "所有尺寸",
    group: "组",
    archiveIndex: "档案索引",
    entries: "项",
    noSignal: "未找到信号",
    emptyHint: "请尝试其他搜索词或筛选条件。",
    signalStable: "信号完整性：稳定",
    redArchive: "红色档案",
    nowPlaying: "正在播放",
    soundArchive: "声音档案",
    selectArtifact: "选择一件物品以开始",
    playbackPosition: "播放位置",
    volume: "音量",
    pickupDropAudio: "拾取 / 放下音效",
    playing: "播放中",
    paused: "已暂停",
    actions: { up: "拾取", down: "放下" }
  }
};

function getLocalizedName(entry, language) {
  if (typeof entry.name === "string") return entry.name;
  return entry.name[language] || entry.name.en;
}

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

function TrackCard({ item, width, activeAction, playing, onPlay, language, copy }) {
  const active = Boolean(activeAction);
  const itemName = getLocalizedName(item, language);

  return (
    <View style={[styles.card, { width }, active && styles.cardActive]}>
      <View style={styles.artworkFrame}>
        <Image source={images[item.id]} style={styles.artwork} resizeMode="cover" />
        <View style={styles.cardShade} />
        <View style={styles.soundGroupTag}>
          <Text style={styles.soundGroupTagText}>
            {language === "en" ? copy.sound.toUpperCase() : copy.sound} {item.audio}
          </Text>
        </View>
        <View style={[styles.soundGroupTag, styles.sizeTag]}>
          <Text style={styles.soundGroupTagText}>
            {item.size.width} × {item.size.height}
          </Text>
        </View>
        {active ? (
          <View style={styles.liveTag}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>
              {playing
                ? `${copy.actions[activeAction].toUpperCase()} ${copy.playing}`
                : `${copy.actions[activeAction].toUpperCase()} ${copy.paused}`}
            </Text>
          </View>
        ) : null}
      </View>
      <View style={styles.cardDetails}>
        <Text numberOfLines={1} style={styles.cardTitle}>{itemName}</Text>
        <Text numberOfLines={1} style={styles.cardType}>{getLocalizedName(typesById[item.type], language)}</Text>
        <View style={styles.soundActions}>
          {[
            { id: "up", label: copy.actions.up.toUpperCase() },
            { id: "down", label: copy.actions.down.toUpperCase() }
          ].map((action) => {
            const isActive = activeAction === action.id;
            return (
              <Pressable
                key={action.id}
                accessibilityRole="button"
                accessibilityLabel={`${action.label} ${itemName}`}
                onPress={() => onPlay(action.id)}
                style={({ pressed, hovered }) => [
                  styles.soundAction,
                  isActive && styles.soundActionActive,
                  (pressed || hovered) && styles.soundActionHovered
                ]}
              >
                <Text style={[styles.soundActionText, isActive && styles.soundActionTextActive]}>
                  {isActive && playing ? "Ⅱ " : "▶ "}{action.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
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

function NowPlaying({ item, action, status, volume, onToggle, onPrevious, onNext, onSeek, onVolumeChange, compact, language, copy }) {
  const [progressWidth, setProgressWidth] = useState(1);
  const [volumeWidth, setVolumeWidth] = useState(1);
  const duration = status.duration || 0;
  const progress = duration > 0 ? Math.min(1, status.currentTime / duration) : 0;
  const volumePercent = Math.round(volume * 100);
  const updateVolume = (event) => {
    const nextVolume = Math.max(0, Math.min(1, event.nativeEvent.locationX / volumeWidth));
    onVolumeChange(nextVolume);
  };

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
            <Text style={styles.playerEyebrow}>{item ? copy.nowPlaying : copy.soundArchive}</Text>
            <Text numberOfLines={1} style={styles.playerTitle}>
              {item ? getLocalizedName(item, language) : copy.selectArtifact}
            </Text>
            <Text numberOfLines={1} style={styles.playerSubtitle}>
              {item
                ? `${copy.actions[action]} · ${copy.sound} ${item.audio}`
                : `${metadata.items.length} ${copy.artifacts.toLowerCase()} · ${soundGroups.length} ${copy.soundGroups.toLowerCase()}`}
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
              accessibilityLabel={copy.playbackPosition}
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
          <View style={styles.volumeRow}>
            <Text style={styles.volumeLabel}>{copy.volume.toUpperCase()}</Text>
            <View
              accessible
              accessibilityRole="adjustable"
              accessibilityLabel={copy.volume}
              accessibilityValue={{ min: 0, max: 100, now: volumePercent, text: `${volumePercent}%` }}
              accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
              onAccessibilityAction={(event) => {
                const change = event.nativeEvent.actionName === "increment" ? 0.1 : -0.1;
                onVolumeChange(Math.max(0, Math.min(1, volume + change)));
              }}
              onLayout={(event) => setVolumeWidth(event.nativeEvent.layout.width)}
              onStartShouldSetResponder={() => true}
              onMoveShouldSetResponder={() => true}
              onResponderGrant={updateVolume}
              onResponderMove={updateVolume}
              style={styles.volumeTrack}
            >
              <View style={[styles.volumeFill, { width: `${volumePercent}%` }]} />
              <View style={[styles.volumeThumb, { left: `${volumePercent}%` }]} />
            </View>
            <Text style={styles.volumeValue}>{volumePercent}%</Text>
          </View>
        </View>

        {!compact ? (
          <View style={styles.playerMeta}>
            <Text style={styles.playerMetaIcon}>◖))</Text>
            <Text style={styles.playerMetaText}>{copy.pickupDropAudio}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

export default function App() {
  const { width } = useWindowDimensions();
  const [language, setLanguage] = useState("en");
  const [query, setQuery] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedSoundGroup, setSelectedSoundGroup] = useState("all");
  const [selectedSize, setSelectedSize] = useState("all");
  const [volume, setVolume] = useState(0.3);
  const [currentItem, setCurrentItem] = useState(null);
  const [currentAction, setCurrentAction] = useState(null);
  const player = useAudioPlayer(null, { updateInterval: 100 });
  const status = useAudioPlayerStatus(player);
  const copy = translations[language];

  useEffect(() => {
    player.volume = volume;
  }, [player, volume]);

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
      const matchesSoundGroup = selectedSoundGroup === "all" || item.audio === selectedSoundGroup;
      const itemSize = `${item.size.width}x${item.size.height}`;
      const matchesSize = selectedSize === "all" || itemSize === selectedSize;
      const matchesQuery = !normalizedQuery ||
        getLocalizedName(item, "en").toLowerCase().includes(normalizedQuery) ||
        getLocalizedName(item, "cn").toLowerCase().includes(normalizedQuery) ||
        getLocalizedName(typesById[item.type], "en").toLowerCase().includes(normalizedQuery) ||
        getLocalizedName(typesById[item.type], "cn").toLowerCase().includes(normalizedQuery) ||
        `sound ${item.audio}`.includes(normalizedQuery) ||
        `声音 ${item.audio}`.includes(normalizedQuery) ||
        itemSize.includes(normalizedQuery);
      return matchesType && matchesSoundGroup && matchesSize && matchesQuery;
    });
  }, [query, selectedSize, selectedSoundGroup, selectedType]);

  const playItem = (item, action = "up") => {
    if (currentItem?.id === item.id && currentAction === action) {
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
    player.replace(sounds[item.audio][action]);
    player.volume = volume;
    setCurrentItem(item);
    setCurrentAction(action);
    player.play();
  };

  const moveTrack = (offset) => {
    if (!currentItem) return;
    const currentIndex = metadata.items.findIndex((item) => item.id === currentItem.id);
    const nextIndex = (currentIndex + offset + metadata.items.length) % metadata.items.length;
    playItem(metadata.items[nextIndex], currentAction || "up");
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
                <Text style={styles.brandSub}>{copy.brandSub}</Text>
              </View>
            </View>
            <View style={styles.navActions}>
              <View style={styles.languageSwitch}>
                {[{ id: "en", label: "EN" }, { id: "cn", label: "中文" }].map((option) => {
                  const active = language === option.id;
                  return (
                    <Pressable
                      key={option.id}
                      accessibilityRole="button"
                      accessibilityLabel={option.id === "en" ? "English" : "中文"}
                      onPress={() => setLanguage(option.id)}
                      style={[styles.languageButton, active && styles.languageButtonActive]}
                    >
                      <Text style={[styles.languageButtonText, active && styles.languageButtonTextActive]}>
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {!compact ? (
                <View style={styles.navStatus}>
                  <View style={styles.statusDot} />
                  <Text style={styles.navStatusText}>{copy.archiveOnline}</Text>
                </View>
              ) : null}
            </View>
          </View>

          <View style={[styles.hero, compact && styles.heroCompact]}>
            <View style={styles.heroCopy}>
              <View style={styles.eyebrowRow}>
                <View style={styles.eyebrowLine} />
                <Text style={styles.eyebrow}>{copy.collectionLabel}</Text>
              </View>
              <Text style={[styles.heroTitle, compact && styles.heroTitleCompact]}>
                {copy.heroLead}{"\n"}<Text style={styles.heroTitleAccent}>{copy.heroAccent}</Text>
              </Text>
              <Text style={styles.heroBody}>{copy.heroBody}</Text>
            </View>
            {!compact ? (
              <View style={styles.heroCount}>
                <Text style={styles.heroCountNumber}>{String(metadata.items.length).padStart(2, "0")}</Text>
                <Text style={styles.heroCountLabel}>{copy.artifacts}</Text>
                <View style={styles.heroCountRule} />
                <Text style={styles.heroCountMeta}>{soundGroups.length} {copy.soundGroups} / {copy.rarity}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.tools}>
            <View style={styles.searchBox}>
              <Text style={styles.searchIcon}>⌕</Text>
              <TextInput
                accessibilityLabel={copy.searchLabel}
                value={query}
                onChangeText={setQuery}
                placeholder={copy.searchPlaceholder}
                placeholderTextColor={palette.faint}
                selectionColor={palette.red}
                style={styles.searchInput}
              />
              {query ? (
                <Pressable accessibilityLabel={copy.clearSearch} onPress={() => setQuery("")}>
                  <Text style={styles.clearSearch}>×</Text>
                </Pressable>
              ) : null}
            </View>
            <View style={styles.soundFilterRow}>
              <Text style={styles.filterLabel}>{copy.category}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
                {[{ id: "all", name: copy.allCategories }, ...metadata.types.map((type) => ({
                  ...type,
                  name: getLocalizedName(type, language)
                }))].map((type) => {
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
            <View style={styles.soundFilterRow}>
              <Text style={styles.filterLabel}>{copy.sound.toUpperCase()}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
                {["all", ...soundGroups].map((group) => {
                  const active = selectedSoundGroup === group;
                  return (
                    <Pressable
                      key={group}
                      onPress={() => setSelectedSoundGroup(group)}
                      style={({ pressed, hovered }) => [
                        styles.filterChip,
                        active && styles.filterChipActive,
                        (pressed || hovered) && styles.filterChipHovered
                      ]}
                    >
                      <Text style={[styles.filterText, active && styles.filterTextActive]}>
                        {group === "all" ? copy.allSounds : `${copy.sound} ${group}`}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
            <View style={styles.soundFilterRow}>
              <Text style={styles.filterLabel}>{copy.size.toUpperCase()}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
                {[{ id: "all", name: copy.allSizes }, ...itemSizes].map((size) => {
                  const active = selectedSize === size.id;
                  return (
                    <Pressable
                      key={size.id}
                      onPress={() => setSelectedSize(size.id)}
                      style={({ pressed, hovered }) => [
                        styles.filterChip,
                        active && styles.filterChipActive,
                        (pressed || hovered) && styles.filterChipHovered
                      ]}
                    >
                      <Text style={[styles.filterText, active && styles.filterTextActive]}>{size.name}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{copy.archiveIndex}</Text>
            <Text style={styles.resultCount}>{filteredItems.length} {copy.entries}</Text>
          </View>

          {filteredItems.length ? (
            <View style={[styles.grid, { gap }]}>
              {filteredItems.map((item) => (
                <TrackCard
                  key={item.id}
                  item={item}
                  width={cardWidth}
                  activeAction={currentItem?.id === item.id ? currentAction : null}
                  playing={status.playing}
                  onPlay={(action) => playItem(item, action)}
                  language={language}
                  copy={copy}
                />
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyGlyph}>∅</Text>
              <Text style={styles.emptyTitle}>{copy.noSignal}</Text>
              <Text style={styles.emptyBody}>{copy.emptyHint}</Text>
            </View>
          )}

          <View style={styles.footer}>
            <Text style={styles.footerText}>ABI / {copy.redArchive} / {new Date().getFullYear()}</Text>
            <Text style={styles.footerText}>{copy.signalStable}</Text>
          </View>
        </View>
      </ScrollView>

      <NowPlaying
        item={currentItem}
        action={currentAction}
        status={status}
        volume={volume}
        compact={compact}
        language={language}
        copy={copy}
        onToggle={() => currentItem && playItem(currentItem, currentAction)}
        onPrevious={() => moveTrack(-1)}
        onNext={() => moveTrack(1)}
        onSeek={(seconds) => player.seekTo(seconds)}
        onVolumeChange={setVolume}
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
  navActions: { flexDirection: "row", alignItems: "center", gap: 18 },
  languageSwitch: {
    flexDirection: "row",
    padding: 2,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 3,
    backgroundColor: palette.surface
  },
  languageButton: {
    minWidth: 38,
    height: 27,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 2,
    cursor: "pointer"
  },
  languageButtonActive: { backgroundColor: palette.red },
  languageButtonText: { color: palette.faint, fontSize: 9, fontWeight: "800", letterSpacing: 0.8 },
  languageButtonTextActive: { color: "#fff8f2" },
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
  soundFilterRow: { flexDirection: "row", alignItems: "center", gap: 13 },
  filterLabel: { color: palette.faint, fontSize: 10, fontWeight: "800", letterSpacing: 1.3 },
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
  filterText: { color: palette.muted, fontSize: 11, fontWeight: "700", letterSpacing: 0.8 },
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
  soundGroupTag: {
    position: "absolute",
    right: 10,
    top: 10,
    height: 23,
    paddingHorizontal: 8,
    borderRadius: 2,
    backgroundColor: "rgba(12,7,7,0.9)",
    borderWidth: 1,
    borderColor: "rgba(228,71,62,0.55)",
    alignItems: "center",
    justifyContent: "center"
  },
  soundGroupTagText: { color: palette.ink, fontSize: 9, fontWeight: "800", letterSpacing: 1 },
  sizeTag: { top: 39 },
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
  soundActions: { flexDirection: "row", gap: 7, marginTop: 7 },
  soundAction: {
    flex: 1,
    height: 36,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.elevated,
    cursor: "pointer"
  },
  soundActionActive: { borderColor: palette.red, backgroundColor: palette.redDark },
  soundActionHovered: { borderColor: palette.red },
  soundActionText: { color: palette.muted, fontSize: 9, fontWeight: "800", letterSpacing: 0.6 },
  soundActionTextActive: { color: palette.ink },
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
  volumeRow: { width: 190, alignSelf: "flex-end", flexDirection: "row", alignItems: "center", gap: 9 },
  volumeLabel: { color: palette.faint, fontSize: 8, fontWeight: "800", letterSpacing: 1.1 },
  volumeTrack: { flex: 1, height: 16, justifyContent: "center", cursor: "pointer" },
  volumeFill: { position: "absolute", left: 0, height: 2, backgroundColor: palette.red },
  volumeThumb: { position: "absolute", width: 8, height: 8, marginLeft: -4, borderRadius: 4, backgroundColor: palette.red },
  volumeValue: { width: 29, color: palette.muted, fontSize: 9, fontVariant: ["tabular-nums"], textAlign: "right" },
  playerMeta: { width: 160, alignItems: "flex-end" },
  playerMetaIcon: { color: palette.red, fontSize: 15, marginBottom: 7 },
  playerMetaText: { color: palette.faint, fontSize: 8, fontWeight: "800", letterSpacing: 1.3 }
});
