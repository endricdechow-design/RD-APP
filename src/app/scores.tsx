import { useState } from 'react';
import { View } from 'react-native';

import { news2, qsofa, schockindex, type News2Parameter } from '@/logic/scores';
import { Abschnitt, Chip, Eingabe, Karte, Quelle, Seite, T, zahlAusText } from '@/ui/bausteine';
import { abstand, useFarben } from '@/ui/theme';

function Feld({ titel, wert, setze, einheit, punkte }: { titel: string; wert: string; setze: (s: string) => void; einheit: string; punkte?: number }) {
  const f = useFarben();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: abstand.m, minHeight: 60 }}>
      <T style={{ flex: 1 }}>{titel}</T>
      <Eingabe wert={wert} setze={setze} platzhalter="–" einheit={einheit} breite={130} />
      <T art="titel" style={{ width: 28, textAlign: 'right' }} farbe={punkte === 3 ? f.rot : punkte ? f.gelb : f.textLeise}>
        {punkte ?? ''}
      </T>
    </View>
  );
}

export default function Scores() {
  const f = useFarben();
  const [af, setAf] = useState('');
  const [rr, setRr] = useState('');
  const [sp, setSp] = useState('');
  const [hf, setHf] = useState('');
  const [temp, setTemp] = useState('');
  const [o2, setO2] = useState(false);
  const [bewusstsein, setBewusstsein] = useState(false);
  const [gcs15, setGcs15] = useState(false);
  const [infekt, setInfekt] = useState(false);

  const werte = { af: zahlAusText(af), rr: zahlAusText(rr), sp: zahlAusText(sp), hf: zahlAusText(hf), t: zahlAusText(temp) };
  const vollstaendig = Object.values(werte).every((v) => v !== undefined);
  const n = vollstaendig
    ? news2({ bewusstseinsveraenderung: bewusstsein, atemfrequenz: werte.af!, rrSys: werte.rr!, spo2: werte.sp!, sauerstoff: o2, herzfrequenz: werte.hf!, temperatur: werte.t! })
    : null;
  const p = (k: News2Parameter) => n?.punkte[k];
  const q = werte.rr !== undefined && werte.af !== undefined ? qsofa({ rrSys: werte.rr, atemfrequenz: werte.af, gcsUnter15: gcs15, infektionsverdacht: infekt }) : null;
  const si = werte.hf !== undefined && werte.rr !== undefined ? schockindex(werte.hf, werte.rr) : null;
  const risikoFarbe = n ? { leicht: f.gruen, moderat: f.gelb, hoch: f.rot }[n.risiko] : f.grau;

  return (
    <Seite>
      <Karte style={{ borderColor: risikoFarbe, borderWidth: 2 }}>
        <T art="klein" leise>NEWS2</T>
        <T art="riesig" farbe={risikoFarbe}>{n ? `${n.summe} Punkte` : '–'}</T>
        <T>{n ? n.text : 'Alle Vitalwerte eingeben.'}</T>
        {n?.einzelparameterDrei ? <T art="klein" farbe={f.gelb}>Ein Parameter mit 3 Punkten: mindestens moderates Risiko.</T> : null}
      </Karte>

      <Abschnitt titel="Vitalwerte">
        <Karte>
          <Feld titel="Atemfrequenz" wert={af} setze={setAf} einheit="/min" punkte={p('atemfrequenz')} />
          <Feld titel="RR systolisch" wert={rr} setze={setRr} einheit="mmHg" punkte={p('rrSys')} />
          <Feld titel="SpO₂" wert={sp} setze={setSp} einheit="%" punkte={p('spo2')} />
          <Feld titel="Herzfrequenz" wert={hf} setze={setHf} einheit="/min" punkte={p('herzfrequenz')} />
          <Feld titel="Temperatur" wert={temp} setze={setTemp} einheit="°C" punkte={p('temperatur')} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: abstand.s, marginTop: abstand.s }}>
            <Chip titel="Raumluft" aktiv={!o2} onPress={() => setO2(false)} />
            <Chip titel="O₂-Gabe" aktiv={o2} onPress={() => setO2(true)} />
            <Chip titel="akute Bewusstseinsveränderung" icon="alert-circle" aktiv={bewusstsein} onPress={() => setBewusstsein(!bewusstsein)} />
          </View>
        </Karte>
      </Abschnitt>

      <Abschnitt titel="qSOFA">
        <Karte>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: abstand.s }}>
            <Chip titel="GCS < 15 / Vigilanzminderung" aktiv={gcs15} onPress={() => setGcs15(!gcs15)} />
            <Chip titel="Verdacht auf Infektion" aktiv={infekt} onPress={() => setInfekt(!infekt)} />
          </View>
          <T art="titel" farbe={q?.hohesRisiko ? f.rot : f.text}>{q ? `${q.punkte} Punkte` : 'RR und AF oben eingeben'}</T>
          {q ? <T art="klein" leise>{q.hohesRisiko ? 'Hohes Risiko für einen schweren Verlauf oder Tod.' : '≥ 2 Punkte und Infektionsverdacht = hohes Risiko.'}</T> : null}
        </Karte>
      </Abschnitt>

      <Abschnitt titel="Schockindex (HF ÷ RR syst.)">
        <Karte>
          <T art="titel" farbe={si?.ueber09 ? f.rot : f.text}>{si ? si.wert.toLocaleString('de-DE') : 'HF und RR eingeben'}</T>
          {si?.ueber09 ? <T art="klein" farbe={f.rot}>Schockindex &gt; 0,9: Kriterium Schockraumalarmierung Trauma (S. 85).</T> : null}
        </Karte>
      </Abschnitt>
      <Quelle seite={155} text="BPR Sepsis (NEWS2, qSOFA); Schockindex S. 85" />
    </Seite>
  );
}
