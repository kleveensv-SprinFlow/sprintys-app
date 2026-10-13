import React, { useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../src/core/theme';
import { glassCard } from '../../src/core/glass';
import { GlassScreen } from '../../src/shared/components/GlassScreen';
import { GlassSheen } from '../../src/shared/components/GlassSheen';
import { Header } from '../../src/shared/components/Header';
import { SegmentedControl } from '../../src/shared/components/SegmentedControl';
import { LEGAL_DOCUMENTS, LegalDocument } from '../../src/legal/documents';

type DocId = LegalDocument['id'];

/** The legal texts, readable in the app (same source as the public pages). */
export default function LegalScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ doc?: string }>();
  const initial = (LEGAL_DOCUMENTS.find((d) => d.id === params.doc)?.id ?? 'terms') as DocId;
  const [docId, setDocId] = React.useState<DocId>(initial);
  const scrollY = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<any>(null);
  const doc = LEGAL_DOCUMENTS.find((d) => d.id === docId)!;

  return (
    <GlassScreen>
      <Header
        title="Informations légales"
        showBackButton
        onBackPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        scrollY={scrollY}
      />
      <Animated.ScrollView
        ref={scrollRef}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        <SegmentedControl
          style={styles.tabs}
          options={[
            { key: 'terms' as DocId, label: 'Conditions' },
            { key: 'privacy' as DocId, label: 'Confidentialité' },
            { key: 'notice' as DocId, label: 'Mentions' },
          ]}
          value={docId}
          onChange={(k) => {
            setDocId(k);
            scrollRef.current?.scrollTo?.({ y: 0, animated: false });
          }}
        />

        <View style={[glassCard, styles.card]}>
          <GlassSheen radius={22} />
          <Text style={styles.title}>{doc.title}</Text>
          <Text style={styles.intro}>{doc.intro}</Text>
          {doc.sections.map((s) => (
            <View key={s.title} style={styles.section}>
              <Text style={styles.sectionTitle}>{s.title}</Text>
              {s.paragraphs.map((p, i) => (
                <Text key={i} style={styles.paragraph}>
                  {p}
                </Text>
              ))}
            </View>
          ))}
        </View>
      </Animated.ScrollView>
    </GlassScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4 },
  tabs: { marginBottom: 12 },
  card: { paddingVertical: 20, paddingHorizontal: 18 },
  title: { fontSize: 24, fontWeight: '800', letterSpacing: -0.6, color: theme.colors.text, marginBottom: 6 },
  intro: { fontSize: 14, lineHeight: 20, color: theme.colors.textSecondary },
  section: {
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.hairline,
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', letterSpacing: -0.2, color: theme.colors.text, marginBottom: 6 },
  paragraph: { fontSize: 15, lineHeight: 22, color: theme.colors.text, marginBottom: 8 },
});
