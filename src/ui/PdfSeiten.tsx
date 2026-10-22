// Originalseiten des Kompendiums: kleine Vorschau am Seitenende, Tippen öffnet Vollbild mit Zoom.
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRef, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SEITEN_BILDER } from '../data/seitenBilder';
import { T } from './bausteine';
import { abstand, radius, useFarben } from './theme';

const SEITENVERHAELTNIS = 842 / 595; // A4 hoch

export function PdfSeiten({ seiten }: { seiten: number[] }) {
  const f = useFarben();
  const vorhanden = [...new Set(seiten)].filter((s) => SEITEN_BILDER[s]);
  const [offen, setOffen] = useState<number | null>(null);
  if (!vorhanden.length) return null;

  return (
    <View style={{ marginTop: abstand.xl, gap: abstand.s }}>
      <T art="klein" leise style={{ fontWeight: '700', letterSpacing: 1 }}>ORIGINAL IM KOMPENDIUM</T>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: abstand.m }}>
        {vorhanden.map((s, i) => (
          <Pressable
            key={s}
            onPress={() => setOffen(i)}
            accessibilityRole="imagebutton"
            accessibilityLabel="Originalseite vergrößern"
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
            <Image
              source={SEITEN_BILDER[s]}
              style={{ width: 110, height: 110 * SEITENVERHAELTNIS, borderRadius: radius.s, borderWidth: 1, borderColor: f.rand, backgroundColor: '#fff' }}
              resizeMode="cover"
            />
            <View style={{ position: 'absolute', right: 6, bottom: 6, backgroundColor: '#000a', borderRadius: 12, padding: 4 }}>
              <Ionicons name="expand" size={16} color="#fff" />
            </View>
          </Pressable>
        ))}
      </ScrollView>
      {offen !== null ? <Vollbild seiten={vorhanden} start={offen} schliessen={() => setOffen(null)} /> : null}
    </View>
  );
}

function Knopf({ icon, onPress, label, aus }: { icon: 'close' | 'add' | 'remove' | 'chevron-back' | 'chevron-forward'; onPress: () => void; label: string; aus?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={aus}
      accessibilityLabel={label}
      hitSlop={8}
      style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#ffffff22', alignItems: 'center', justifyContent: 'center', opacity: aus ? 0.3 : 1 }}>
      <Ionicons name={icon} size={26} color="#fff" />
    </Pressable>
  );
}

function Vollbild({ seiten, start, schliessen }: { seiten: number[]; start: number; schliessen: () => void }) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(start);
  const [zoom, setZoom] = useState(1);
  const letzterTipp = useRef(0);
  const breite = Math.min(width, 900) * zoom;

  const doppeltipp = () => {
    const jetzt = Date.now();
    if (jetzt - letzterTipp.current < 300) setZoom((z) => (z === 1 ? 2.5 : 1));
    letzterTipp.current = jetzt;
  };

  return (
    <Modal visible animationType="fade" onRequestClose={schliessen} supportedOrientations={['portrait', 'landscape']}>
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ alignItems: zoom === 1 ? 'center' : 'flex-start', paddingTop: insets.top + 64, paddingBottom: 96 }}
          maximumZoomScale={4}
          minimumZoomScale={1}>
          <ScrollView horizontal contentContainerStyle={{ minWidth: width, justifyContent: 'center' }} scrollEnabled={zoom > 1}>
            <Pressable onPress={doppeltipp}>
              <Image
                source={SEITEN_BILDER[seiten[index]]}
                style={{ width: breite, height: breite * SEITENVERHAELTNIS, backgroundColor: '#fff' }}
                resizeMode="contain"
              />
            </Pressable>
          </ScrollView>
        </ScrollView>

        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, paddingTop: insets.top + 8, paddingBottom: 8, paddingHorizontal: 12, backgroundColor: '#000c', flexDirection: 'row', justifyContent: 'space-between' }}>
          <Knopf icon="close" onPress={schliessen} label="Schließen" />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Knopf icon="remove" onPress={() => setZoom((z) => Math.max(1, z - 0.75))} label="Verkleinern" aus={zoom <= 1} />
            <Knopf icon="add" onPress={() => setZoom((z) => Math.min(4, z + 0.75))} label="Vergrößern" aus={zoom >= 4} />
          </View>
        </View>

        {seiten.length > 1 ? (
          <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, paddingBottom: insets.bottom + 12, paddingTop: 12, backgroundColor: '#000c', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 24 }}>
            <Knopf icon="chevron-back" onPress={() => { setIndex((i) => i - 1); setZoom(1); }} label="Vorherige Seite" aus={index === 0} />
            <T farbe="#fff">{`${index + 1} / ${seiten.length}`}</T>
            <Knopf icon="chevron-forward" onPress={() => { setIndex((i) => i + 1); setZoom(1); }} label="Nächste Seite" aus={index === seiten.length - 1} />
          </View>
        ) : null}
      </View>
    </Modal>
  );
}
