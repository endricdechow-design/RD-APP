import { useState } from 'react';
import { Alert, Platform, View } from 'react-native';

import { bereiche } from '@/data/kompendium';
import type { Qualifikation } from '@/data/typen';
import { QUALI_NAME } from '@/logic/freigabe';
import { useApp, type Einstellungen } from '@/state/AppState';
import { Abschnitt, Chip, Eingabe, Knopf, Seite, T } from '@/ui/bausteine';
import { abstand } from '@/ui/theme';

const QUALIS: Qualifikation[] = ['RS', 'NotSan', 'NotSanAzubi'];

export default function Profil() {
  const { profil, setzeProfil, einstellungen, setzeEinstellungen, zuruecksetzen, setzeLernstand } = useApp();
  const datum = einstellungen.pruefungsdatum ? new Date(einstellungen.pruefungsdatum) : null;
  const [tage, setTage] = useState(() => (datum ? String(Math.max(1, Math.ceil((datum.getTime() - Date.now()) / 86_400_000))) : ''));

  const bestaetige = (text: string, aktion: () => void) => {
    if (Platform.OS === 'web') {
      if (globalThis.confirm?.(text)) aktion();
      return;
    }
    Alert.alert('Sicher?', text, [{ text: 'Abbrechen', style: 'cancel' }, { text: 'Ja', style: 'destructive', onPress: aktion }]);
  };

  return (
    <Seite>
      <Abschnitt titel="Qualifikation">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: abstand.s }}>
          {QUALIS.map((q) => (
            <Chip key={q} titel={QUALI_NAME[q]} aktiv={profil.qualifikation === q} onPress={() => setzeProfil({ ...profil, qualifikation: q })} />
          ))}
        </View>
      </Abschnitt>

      <Abschnitt titel="Rettungsdienstbereich">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: abstand.s }}>
          <Chip titel="Keiner" aktiv={profil.bereich === null} onPress={() => setzeProfil({ ...profil, bereich: null })} />
          {bereiche.map((b) => (
            <Chip key={b.code} titel={b.name} aktiv={profil.bereich === b.code} onPress={() => setzeProfil({ ...profil, bereich: b.code })} />
          ))}
        </View>
      </Abschnitt>

      <Abschnitt titel="Prüfung">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: abstand.m }}>
          <T>Prüfung in</T>
          <Eingabe wert={tage} setze={setTage} platzhalter="–" einheit="Tagen" breite={150} />
          <Knopf
            titel="Speichern"
            art="leise"
            onPress={() => {
              const n = Number(tage);
              setzeEinstellungen({ pruefungsdatum: n > 0 ? Date.now() + n * 86_400_000 : null });
            }}
          />
        </View>
        {datum ? <T art="klein" leise>{`Prüfungsdatum: ${datum.toLocaleDateString('de-DE')}`}</T> : null}
      </Abschnitt>

      <Abschnitt titel="Darstellung">
        <View style={{ flexDirection: 'row', gap: abstand.s }}>
          {(['auto', 'dunkel', 'hell'] as Einstellungen['darstellung'][]).map((d) => (
            <Chip key={d} titel={{ auto: 'Automatisch', dunkel: 'Nacht', hell: 'Tag' }[d]} aktiv={einstellungen.darstellung === d} onPress={() => setzeEinstellungen({ darstellung: d })} />
          ))}
        </View>
      </Abschnitt>

      <Abschnitt titel="Daten">
        <Knopf titel="Lernstand zurücksetzen" art="leise" icon="refresh" onPress={() => bestaetige('Gesamten Lernfortschritt löschen?', () => setzeLernstand({}))} />
        <Knopf titel="App zurücksetzen" art="leise" icon="trash" onPress={() => bestaetige('Profil, Favoriten und Lernstand löschen?', zuruecksetzen)} />
        <T art="klein" leise>Alle Daten bleiben auf diesem Gerät. Patientendaten werden nie gespeichert.</T>
      </Abschnitt>
    </Seite>
  );
}
