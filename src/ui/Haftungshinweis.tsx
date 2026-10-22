// Hinweis beim App-Start – muss bei jedem Start bestätigt werden.
// Der Wortlaut ist ein Entwurf und sollte vor der Veröffentlichung juristisch geprüft werden.
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useApp } from '../state/AppState';
import { Knopf } from './bausteine';
import { abstand, radius, useFarben } from './theme';

export function Haftungshinweis() {
  const f = useFarben();
  const insets = useSafeAreaInsets();
  const { bestaetigeHinweis, setzeEinstellungen } = useApp();
  const dunkel = f.hintergrund === '#0B0F14';
  const absatz = { color: f.text, fontSize: 16, lineHeight: 23 } as const;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: f.hintergrund }}
      contentContainerStyle={{ padding: abstand.l, paddingTop: insets.top + abstand.xl, paddingBottom: insets.bottom + abstand.xl, alignItems: 'center' }}>
      <View style={{ width: '100%', maxWidth: 640, gap: abstand.l }}>
        <View>
          <Text style={{ color: f.text, fontSize: 26, fontWeight: '800' }}>Nodexo</Text>
          <Text style={{ color: f.textLeise, fontSize: 16 }}>Lern- und Nachschlagehilfe zum Gemeinsamen Kompendium Rettungsdienst 2026</Text>
        </View>

        <Text style={absatz}>
          Die Inhalte entsprechen den Standardarbeitsanweisungen (SAA) und Behandlungspfaden (BPR) des Gemeinsamen
          Kompendiums Rettungsdienst in der Ausgabe 2026. Nodexo ist keine offizielle Veröffentlichung der Herausgeber
          oder der Ärztlichen Leitungen Rettungsdienst.
        </Text>

        <View style={{ borderWidth: 2, borderColor: f.notfall, borderRadius: radius.m, padding: abstand.m, gap: abstand.s, backgroundColor: f.flaeche }}>
          <Text style={[absatz, { fontWeight: '700' }]}>
            Diese App dient als Lernhilfe in der Aus- und Weiterbildung und als Gedächtnisstütze. Sie richtet sich
            ausschließlich an Rettungsdienstfachpersonal.
          </Text>
          <Text style={absatz}>
            Sie darf nicht alleinige Grundlage deines Handelns sein und ersetzt weder Ausbildung, Fachliteratur noch das
            Kompendium selbst. Maßgeblich sind die jeweils gültige Ausgabe des Kompendiums, die Vorgaben deiner Ärztlichen
            Leitung Rettungsdienst und die örtlichen Verfahrensanweisungen. Die App trifft keine Therapieentscheidungen.
          </Text>
          <Text style={absatz}>
            Freigaben gelten nur im jeweiligen Rettungsdienstbereich und nur für die angegebene Qualifikation. Dosisberechnungen
            sind vor jeder Gabe im Vier-Augen-Prinzip zu prüfen.
          </Text>
        </View>

        <Text style={[absatz, { color: f.notfall, fontWeight: '700' }]}>
          Trotz aller Sorgfalt kann für die Fehlerfreiheit der übertragenen Daten keine Gewähr übernommen werden. Für
          Schäden, die durch die Anwendung dieser Informationen entstehen, wird keine Haftung übernommen.
        </Text>

        <Text style={[absatz, { color: f.textLeise, fontSize: 14 }]}>
          Alle Eingaben (Profil, Lernstand) bleiben auf diesem Gerät. Patientendaten werden nicht gespeichert.
        </Text>

        <Knopf titel="Verstanden" gross onPress={bestaetigeHinweis} />
        <Knopf
          titel={dunkel ? 'Hellmodus' : 'Dunkelmodus'}
          art="leise"
          icon={dunkel ? 'sunny' : 'moon'}
          onPress={() => setzeEinstellungen({ darstellung: dunkel ? 'hell' : 'dunkel' })}
        />
      </View>
    </ScrollView>
  );
}
