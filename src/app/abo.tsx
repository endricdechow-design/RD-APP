import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { View } from 'react-native';

import { BASIS_TAGESFRAGEN, useApp } from '@/state/AppState';
import { Abschnitt, Hinweis, Karte, Knopf, Seite, T } from '@/ui/bausteine';
import { abstand, useFarben } from '@/ui/theme';

const BASIS = [
  'Alle SAA, Behandlungspfade und Freigaben deines Bereichs',
  'Dosisrechner mit mg und ml',
  'REA-Cockpit, Scores, Checklisten',
  `Lernen: ${BASIS_TAGESFRAGEN} Fragen pro Tag, gemischt oder nach Themen`,
];

const PRO = [
  'Unbegrenzt lernen – alle Fragen deines Stoffs',
  'Prüfungssimulation: 30 Fragen in 30 Minuten mit Auswertung',
  'Wiederholen nach dem Leitner-System (fällige Karten)',
  'Fehlertraining: nur deine Schwachstellen',
  'Lernplan bis zum Prüfungsdatum mit Tagesziel',
  'Kompendium-Update am Erscheinungstag inkl. „Was ist neu“-Lernpaket',
];

function Liste({ punkte, farbe }: { punkte: string[]; farbe: string }) {
  return (
    <View style={{ gap: 6 }}>
      {punkte.map((p) => (
        <View key={p} style={{ flexDirection: 'row', gap: 8 }}>
          <Ionicons name="checkmark-circle" size={20} color={farbe} />
          <T style={{ flex: 1 }}>{p}</T>
        </View>
      ))}
    </View>
  );
}

export default function Abo() {
  const f = useFarben();
  const { abo, setzeAbo } = useApp();
  return (
    <Seite>
      <T art="gross">Nodexo Pro</T>
      <T leise>Bestehe deine Prüfung – und bleib danach sicher.</T>

      <Abschnitt titel="Immer kostenlos">
        <Karte>
          <Liste punkte={BASIS} farbe={f.gruen} />
          <T art="klein" leise>Einsatzwissen kommt nie hinter eine Bezahlschranke.</T>
        </Karte>
      </Abschnitt>

      <Abschnitt titel="Pro">
        <Karte style={{ borderColor: f.gelb, borderWidth: 2 }}>
          <Liste punkte={PRO} farbe={f.gelb} />
          <View style={{ flexDirection: 'row', gap: abstand.m, marginTop: abstand.s }}>
            <Karte style={{ flex: 1, alignItems: 'center' }}>
              <T art="titel">4,99 €</T>
              <T art="klein" leise>pro Monat</T>
            </Karte>
            <Karte style={{ flex: 1, alignItems: 'center', borderColor: f.gelb }}>
              <T art="titel">39,99 €</T>
              <T art="klein" leise>pro Jahr</T>
            </Karte>
          </View>
          <T art="klein" leise>Azubi-Tarif mit Schulnachweis: 2,49 € / Monat. Preise sind ein Vorschlag (siehe docs/ABO-MODELL.md).</T>
        </Karte>
      </Abschnitt>

      <View style={{ marginTop: abstand.l, gap: abstand.m }}>
        <Hinweis>Demo: Der Kauf über App Store / Google Play ist noch nicht angebunden. Der Schalter aktiviert Pro nur auf diesem Gerät.</Hinweis>
        <Knopf
          titel={abo === 'pro' ? 'Pro deaktivieren (Demo)' : 'Pro aktivieren (Demo)'}
          icon="star"
          gross
          onPress={() => {
            setzeAbo(abo === 'pro' ? 'basis' : 'pro');
            router.back();
          }}
        />
      </View>

      <Abschnitt titel="Für Wachen, Träger und Schulen">
        <Karte>
          <T art="untertitel">Nodexo Team</T>
          <T art="klein">
            Jährliche Kompetenzüberprüfung für vorabdelegierte Maßnahmen (★) als dokumentierter Test, anonymisierte Auswertung für die ÄLRD, Kursmodus für Berufsfachschulen.
          </T>
        </Karte>
      </Abschnitt>
    </Seite>
  );
}
