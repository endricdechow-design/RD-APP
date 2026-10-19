// Patientendaten für alle Dosierungen: einmal eingeben, überall gerechnet.
import { useState } from 'react';
import { View } from 'react-native';

import { useApp } from '../state/AppState';
import { Chip, Eingabe, T, zahlAusText } from './bausteine';
import { abstand, radius, useFarben } from './theme';

export function PatientLeiste({ hinweisIdealgewicht }: { hinweisIdealgewicht?: boolean }) {
  const f = useFarben();
  const { patient, setzePatient } = useApp();
  const [alter, setAlter] = useState(patient.alterJahre ? String(patient.alterJahre) : '');
  const [gewicht, setGewicht] = useState(patient.gewichtKg ? String(patient.gewichtKg) : '');

  const aendereAlter = (s: string) => {
    setAlter(s);
    setzePatient({ ...patient, alterJahre: zahlAusText(s) });
  };
  const aendereGewicht = (s: string) => {
    setGewicht(s);
    setzePatient({ ...patient, gewichtKg: zahlAusText(s) });
  };

  return (
    <View style={{ backgroundColor: f.flaeche, borderColor: f.rand, borderWidth: 1, borderRadius: radius.l, padding: abstand.m, gap: abstand.s }}>
      <View style={{ flexDirection: 'row', gap: abstand.s, alignItems: 'center', flexWrap: 'wrap' }}>
        <T art="klein" leise style={{ fontWeight: '700' }}>PATIENT</T>
        <Chip titel="Erwachsen" aktiv={patient.erwachsen} onPress={() => setzePatient({ ...patient, erwachsen: true })} icon="person" />
        <Chip titel="Kind" aktiv={!patient.erwachsen} onPress={() => setzePatient({ ...patient, erwachsen: false })} icon="happy" />
      </View>
      <View style={{ flexDirection: 'row', gap: abstand.s, flexWrap: 'wrap' }}>
        <Eingabe wert={alter} setze={aendereAlter} platzhalter="Alter" einheit="J." breite={120} />
        <Eingabe wert={gewicht} setze={aendereGewicht} platzhalter="Gewicht" einheit="kg" breite={140} />
      </View>
      <T art="klein" leise>
        Gewicht wiegen bzw. erfragen – das Kompendium nennt keine Schätzformel.
        {hinweisIdealgewicht ? ' Bei Fentanyl ideales Körpergewicht eingeben.' : ''}
      </T>
    </View>
  );
}
