// Patientendaten für Dosierungen. Alter und Gewicht erscheinen nur, wenn eine der
// gezeigten Dosisregeln sie für den gewählten Patienten (Erwachsen/Kind) wirklich braucht.
import { useState } from 'react';
import { View } from 'react-native';

import type { Dosisregel } from '../data/typen';
import { benoetigteAngaben } from '../logic/dosis';
import { useApp } from '../state/AppState';
import { Chip, Eingabe, T, zahlAusText } from './bausteine';
import { abstand, radius, useFarben } from './theme';

export function PatientLeiste({ regeln = [], hinweisIdealgewicht }: { regeln?: Dosisregel[]; hinweisIdealgewicht?: boolean }) {
  const f = useFarben();
  const { patient, setzePatient } = useApp();
  const [alter, setAlter] = useState(patient.alterJahre ? String(patient.alterJahre) : '');
  const [gewicht, setGewicht] = useState(patient.gewichtKg ? String(patient.gewichtKg) : '');
  const noetig = benoetigteAngaben(regeln, patient.erwachsen);

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
      {noetig.alter || noetig.gewicht ? (
        <>
          <View style={{ flexDirection: 'row', gap: abstand.s, flexWrap: 'wrap' }}>
            {noetig.alter ? <Eingabe wert={alter} setze={aendereAlter} platzhalter="Alter" einheit="J." breite={120} /> : null}
            {noetig.gewicht ? <Eingabe wert={gewicht} setze={aendereGewicht} platzhalter="Gewicht" einheit="kg" breite={140} /> : null}
          </View>
          {noetig.gewicht ? (
            <T art="klein" leise>
              Gewicht wiegen bzw. erfragen – das Kompendium nennt keine Schätzformel.
              {hinweisIdealgewicht ? ' Bei Fentanyl ideales Körpergewicht eingeben.' : ''}
            </T>
          ) : null}
        </>
      ) : null}
    </View>
  );
}
