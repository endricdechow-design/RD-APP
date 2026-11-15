// Code-Abfrage für die Web-Version. Nach richtiger Eingabe merkt sich das Gerät die Freischaltung.
import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { codeKorrekt } from '../logic/zugang';
import { Knopf } from './bausteine';
import { abstand, radius, TOUCH, useFarben } from './theme';

export function Zugangssperre({ freigeschaltet }: { freigeschaltet: () => void }) {
  const f = useFarben();
  const insets = useSafeAreaInsets();
  const [code, setCode] = useState('');
  const [fehler, setFehler] = useState(false);
  const [prueft, setPrueft] = useState(false);

  const pruefen = async () => {
    setPrueft(true);
    const ok = await codeKorrekt(code).catch(() => false);
    setPrueft(false);
    if (ok) freigeschaltet();
    else setFehler(true);
  };

  return (
    <View style={{ flex: 1, backgroundColor: f.hintergrund, alignItems: 'center', justifyContent: 'center', padding: abstand.l, paddingTop: insets.top + abstand.l }}>
      <View style={{ width: '100%', maxWidth: 420, gap: abstand.l }}>
        <View>
          <Text style={{ color: f.text, fontSize: 30, fontWeight: '800' }}>Nodexo</Text>
          <Text style={{ color: f.textLeise, fontSize: 16 }}>Testversion – Zugang nur mit Code</Text>
        </View>
        <TextInput
          value={code}
          onChangeText={(t) => {
            setCode(t);
            setFehler(false);
          }}
          onSubmitEditing={pruefen}
          placeholder="Zugangscode"
          placeholderTextColor={f.textLeise}
          autoCapitalize="characters"
          autoCorrect={false}
          autoFocus
          accessibilityLabel="Zugangscode"
          style={{
            height: TOUCH + 4,
            borderRadius: radius.m,
            borderWidth: 2,
            borderColor: fehler ? f.notfall : f.akzent,
            backgroundColor: f.flaeche,
            color: f.text,
            fontSize: 22,
            fontWeight: '700',
            letterSpacing: 2,
            paddingHorizontal: abstand.m,
          }}
        />
        {fehler ? <Text style={{ color: f.notfall, fontSize: 15 }}>Der Code ist nicht richtig.</Text> : null}
        <Knopf titel={prueft ? 'Prüfe …' : 'Öffnen'} icon="lock-open" gross deaktiviert={!code.trim() || prueft} onPress={pruefen} />
      </View>
    </View>
  );
}
