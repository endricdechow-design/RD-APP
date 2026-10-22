// Wiederverwendbare UI-Bausteine. Große Touch-Ziele, hoher Kontrast.
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState, type ComponentProps, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';

import type { Textpunkt } from '../data/typen';
import type { FreigabeArt, FreigabeBewertung } from '../logic/freigabe';
import { ohneSeiten } from '../logic/text';
import { abstand, radius, TOUCH, useFarben, type Farben } from './theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export function Seite({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  const f = useFarben();
  if (!scroll) return <View style={[s.seite, { backgroundColor: f.hintergrund }]}>{children}</View>;
  return (
    <ScrollView style={{ backgroundColor: f.hintergrund }} contentContainerStyle={s.seiteInhalt} keyboardShouldPersistTaps="handled">
      <View style={s.breite}>{children}</View>
    </ScrollView>
  );
}

export function T({
  children,
  art = 'text',
  leise,
  farbe,
  style,
  zeilen,
}: {
  children: ReactNode;
  art?: 'gross' | 'titel' | 'untertitel' | 'text' | 'klein' | 'riesig';
  leise?: boolean;
  farbe?: string;
  style?: object;
  zeilen?: number;
}) {
  const f = useFarben();
  // Seitenzahlen werden nie angezeigt – auch nicht in Texten aus Logik und Daten
  const inhalt = typeof children === 'string' ? ohneSeiten(children) : children;
  return (
    <Text numberOfLines={zeilen} style={[s[art], { color: farbe ?? (leise ? f.textLeise : f.text) }, style]}>
      {inhalt}
    </Text>
  );
}

export function Karte({ children, style, onPress }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  const f = useFarben();
  const inhalt = <View style={[s.karte, { backgroundColor: f.flaeche, borderColor: f.rand }, style]}>{children}</View>;
  if (!onPress) return inhalt;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && { opacity: 0.75 }} accessibilityRole="button">
      {inhalt}
    </Pressable>
  );
}

export function Knopf({
  titel,
  onPress,
  art = 'primaer',
  icon,
  gross,
  deaktiviert,
  style,
}: {
  titel: string;
  onPress: () => void;
  art?: 'primaer' | 'notfall' | 'leise' | 'umriss';
  icon?: IconName;
  gross?: boolean;
  deaktiviert?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const f = useFarben();
  const bg = { primaer: f.akzent, notfall: f.notfall, leise: f.flaecheHoch, umriss: 'transparent' }[art];
  const fg = { primaer: f.akzentText, notfall: f.notfallText, leise: f.text, umriss: f.akzent }[art];
  return (
    <Pressable
      onPress={onPress}
      disabled={deaktiviert}
      accessibilityRole="button"
      accessibilityLabel={titel}
      style={({ pressed }) => [
        s.knopf,
        { backgroundColor: bg, borderColor: art === 'umriss' ? f.akzent : bg, minHeight: gross ? 88 : TOUCH },
        (pressed || deaktiviert) && { opacity: deaktiviert ? 0.4 : 0.8 },
        style,
      ]}>
      {icon ? <Ionicons name={icon} size={gross ? 28 : 20} color={fg} /> : null}
      <Text style={[s.knopfText, { color: fg, fontSize: gross ? 22 : 17 }]}>{titel}</Text>
    </Pressable>
  );
}

export function Chip({ titel, aktiv, onPress, icon }: { titel: string; aktiv?: boolean; onPress: () => void; icon?: IconName }) {
  const f = useFarben();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!aktiv }}
      style={[s.chip, { backgroundColor: aktiv ? f.akzent : f.flaecheHoch, borderColor: aktiv ? f.akzent : f.rand }]}>
      {icon ? <Ionicons name={icon} size={16} color={aktiv ? f.akzentText : f.text} /> : null}
      <Text style={{ color: aktiv ? f.akzentText : f.text, fontWeight: '600', fontSize: 15 }}>{titel}</Text>
    </Pressable>
  );
}

export function Zeile({
  titel,
  untertitel,
  icon,
  rechts,
  route,
  onPress,
}: {
  titel: string;
  untertitel?: string;
  icon?: IconName;
  rechts?: ReactNode;
  route?: string;
  onPress?: () => void;
}) {
  const f = useFarben();
  const druck = onPress ?? (route ? () => router.push(route as never) : undefined);
  return (
    <Pressable
      onPress={druck}
      accessibilityRole="button"
      style={({ pressed }) => [s.zeile, { borderBottomColor: f.rand }, pressed && { backgroundColor: f.flaecheHoch }]}>
      {icon ? <Ionicons name={icon} size={22} color={f.akzent} style={{ marginRight: abstand.m }} /> : null}
      <View style={{ flex: 1 }}>
        <T art="untertitel">{titel}</T>
        {untertitel ? <T art="klein" leise>{untertitel}</T> : null}
      </View>
      {rechts}
      {druck ? <Ionicons name="chevron-forward" size={20} color={f.textLeise} /> : null}
    </Pressable>
  );
}

export function Aufklapper({ titel, children, offen: start = false, anzahl }: { titel: string; children: ReactNode; offen?: boolean; anzahl?: number }) {
  const f = useFarben();
  const [offen, setOffen] = useState(start);
  return (
    <View style={[s.aufklapper, { borderColor: f.rand, backgroundColor: f.flaeche }]}>
      <Pressable onPress={() => setOffen(!offen)} style={s.aufklapperKopf} accessibilityRole="button" accessibilityState={{ expanded: offen }}>
        <T art="untertitel" style={{ flex: 1 }}>
          {titel}
          {anzahl !== undefined ? <T art="klein" leise>{`  ${anzahl}`}</T> : null}
        </T>
        <Ionicons name={offen ? 'chevron-up' : 'chevron-down'} size={22} color={f.textLeise} />
      </Pressable>
      {offen ? <View style={{ paddingHorizontal: abstand.l, paddingBottom: abstand.l }}>{children}</View> : null}
    </View>
  );
}

/** Farben der Inhaltskästen – hell mit dunkler Schrift, auch bei Sonnenlicht lesbar */
export const KASTEN = {
  gelb: '#F3EE73',
  rot: '#F3908A',
  orange: '#F7C47B',
  grau: '#CDD2D8',
  tuerkis: '#A9EFEC',
  gruen: '#A8E3A3',
  blau: '#BCD5FF',
  lila: '#D6C4F5',
} as const;
export type KastenFarbe = keyof typeof KASTEN | 'umriss';

/** Farbiger Inhaltskasten mit Überschrift (Aufbau wie gedruckte SAA) */
export function Kasten({ titel, farbe, children, rechts }: { titel: string; farbe: KastenFarbe; children: ReactNode; rechts?: ReactNode }) {
  const f = useFarben();
  const umriss = farbe === 'umriss';
  return (
    <View
      style={{
        backgroundColor: umriss ? 'transparent' : KASTEN[farbe],
        borderWidth: umriss ? 1.5 : 0,
        borderColor: f.text,
        borderRadius: radius.s,
        padding: abstand.m,
        gap: 6,
      }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: abstand.s }}>
        <Text style={{ fontSize: 17, fontWeight: '800', color: umriss ? f.text : '#111', flex: 1 }}>{titel}</Text>
        {rechts}
      </View>
      {children}
    </View>
  );
}

/** Aufzählung aus dem Kompendium; Ergänzungen (Mitternachtsblau kursiv) werden markiert */
export function Punkte({ punkte, warnung, aufHell }: { punkte: Textpunkt[] | undefined; warnung?: boolean; aufHell?: boolean }) {
  const f = useFarben();
  const textFarbe = aufHell ? '#111' : f.text;
  const ergaenzung = aufHell ? '#0E2A8A' : f.ergaenzung;
  if (!punkte?.length) return <T farbe={textFarbe}>–</T>;
  return (
    <View style={{ gap: 4 }}>
      {punkte.map((p, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: 8 }}>
          {p.bold ? null : <Text style={[s.text, { color: aufHell ? '#111' : warnung ? f.rot : f.textLeise }]}>{p.bullet ? '•' : ' '}</Text>}
          <Text
            style={[
              s.text,
              { color: p.ergaenzung ? ergaenzung : textFarbe, flex: 1 },
              p.bold && { fontWeight: '700', marginTop: i ? 6 : 0 },
              p.ergaenzung && { fontStyle: 'italic' },
            ]}>
            {ohneSeiten(p.text)}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function Quelle({ text }: { seite?: number; text?: string }) {
  return (
    <T art="klein" leise style={{ marginTop: abstand.s }}>
      {`Quelle: Gemeinsames Kompendium Rettungsdienst 2026${text ? ` – ${text}` : ''}`}
    </T>
  );
}

export function artFarbe(art: FreigabeArt, f: Farben): string {
  switch (art) {
    case 'erlaubt':
      return f.gruen;
    case 'nur_tna_na':
      return f.gelb;
    case 'nur_notarzt':
    case 'hoehere_qualifikation':
      return f.rot;
    default:
      return f.grau;
  }
}

export function FreigabeBadge({ b, gross }: { b: FreigabeBewertung | null; gross?: boolean }) {
  const f = useFarben();
  if (!b) return null;
  const farbe = artFarbe(b.art, f);
  const icon: IconName = b.art === 'erlaubt' ? 'checkmark-circle' : b.art === 'nur_tna_na' ? 'call' : b.art === 'nicht_vorgesehen' ? 'remove-circle' : 'alert-circle';
  return (
    <View style={[s.badge, { borderColor: farbe, backgroundColor: farbe + '22' }, gross && { paddingVertical: 8, paddingHorizontal: 12 }]}>
      <Ionicons name={icon} size={gross ? 18 : 14} color={farbe} />
      <Text style={{ color: farbe, fontWeight: '700', fontSize: gross ? 16 : 13 }}>{b.label}</Text>
    </View>
  );
}

export function Hinweis({ children, art = 'info' }: { children: ReactNode; art?: 'info' | 'warnung' }) {
  const f = useFarben();
  const farbe = art === 'warnung' ? f.gelb : f.akzent;
  return (
    <View style={[s.hinweis, { borderLeftColor: farbe, backgroundColor: f.flaecheHoch }]}>
      <Ionicons name={art === 'warnung' ? 'warning' : 'information-circle'} size={20} color={farbe} />
      <View style={{ flex: 1 }}>{typeof children === 'string' ? <T art="klein">{children}</T> : children}</View>
    </View>
  );
}

export function Eingabe({
  wert,
  setze,
  platzhalter,
  einheit,
  breite = 110,
}: {
  wert: string;
  setze: (s: string) => void;
  platzhalter: string;
  einheit?: string;
  breite?: number;
}) {
  const f = useFarben();
  return (
    <View style={[s.eingabe, { backgroundColor: f.flaecheHoch, borderColor: f.rand, width: breite }]}>
      <TextInput
        value={wert}
        onChangeText={setze}
        placeholder={platzhalter}
        placeholderTextColor={f.textLeise}
        keyboardType="decimal-pad"
        style={{ flex: 1, color: f.text, fontSize: 20, fontWeight: '700', minWidth: 0 }}
        accessibilityLabel={platzhalter}
      />
      {einheit ? <T leise>{einheit}</T> : null}
    </View>
  );
}

export function Abschnitt({ titel, children, rechts }: { titel: string; children: ReactNode; rechts?: ReactNode }) {
  return (
    <View style={{ marginTop: abstand.xl, gap: abstand.s }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <T art="klein" leise style={{ flex: 1, textTransform: 'uppercase', letterSpacing: 1, fontWeight: '700' }}>
          {titel}
        </T>
        {rechts}
      </View>
      {children}
    </View>
  );
}

export function zahlAusText(s: string): number | undefined {
  const n = Number(s.replace(',', '.'));
  return s.trim() && Number.isFinite(n) && n > 0 ? n : undefined;
}

const s = StyleSheet.create({
  seite: { flex: 1 },
  seiteInhalt: { padding: abstand.l, paddingBottom: 120, alignItems: 'center' },
  breite: { width: '100%', maxWidth: 720 },
  riesig: { fontSize: 40, fontWeight: '800', letterSpacing: -0.5 },
  gross: { fontSize: 28, fontWeight: '800' },
  titel: { fontSize: 21, fontWeight: '700' },
  untertitel: { fontSize: 17, fontWeight: '600' },
  text: { fontSize: 16, lineHeight: 23 },
  klein: { fontSize: 13.5, lineHeight: 19 },
  karte: { borderRadius: radius.l, borderWidth: 1, padding: abstand.l, gap: abstand.s },
  knopf: {
    borderRadius: radius.m,
    borderWidth: 2,
    paddingHorizontal: abstand.l,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: abstand.s,
  },
  knopfText: { fontWeight: '800' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 22,
    borderWidth: 1,
  },
  zeile: { flexDirection: 'row', alignItems: 'center', minHeight: TOUCH + 8, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  aufklapper: { borderRadius: radius.m, borderWidth: 1, overflow: 'hidden' },
  aufklapperKopf: { flexDirection: 'row', alignItems: 'center', minHeight: TOUCH, paddingHorizontal: abstand.l },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  hinweis: { flexDirection: 'row', gap: abstand.s, padding: abstand.m, borderLeftWidth: 4, borderRadius: radius.s },
  eingabe: { flexDirection: 'row', alignItems: 'center', gap: 6, height: TOUCH, borderRadius: radius.m, borderWidth: 1, paddingHorizontal: abstand.m },
});
