import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, View } from 'react-native';

import { alleMedikamentNamen, dosisregelnFuer, freigabenFuer, medikament, zusatzmedikamente } from '@/data/kompendium';
import type { Freigabe } from '@/data/typen';
import { ART_REIHENFOLGE, bewerte } from '@/logic/freigabe';
import { useApp } from '@/state/AppState';
import { Abschnitt, Aufklapper, Hinweis, Karte, Punkte, Quelle, Seite, T } from '@/ui/bausteine';
import { FreigabeKarte } from '@/ui/FreigabeKarte';
import { PatientLeiste } from '@/ui/PatientLeiste';
import { abstand, useFarben } from '@/ui/theme';

export default function MedikamentSeite() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const f = useFarben();
  const { profil, patient, favoriten, schalteFavorit, merkeBesuch } = useApp();
  const m = medikament(id);
  const name = alleMedikamentNamen().find((x) => x.id === id)?.name ?? id;
  const route = `/medikament/${id}`;
  useEffect(() => merkeBesuch(route), [route]); // eslint-disable-line react-hooks/exhaustive-deps

  const regeln = dosisregelnFuer(id);
  const relevant = (fr: Freigabe) =>
    fr.zielgruppe === 'alle' || (patient.erwachsen ? fr.zielgruppe === 'erwachsene' : fr.zielgruppe === 'kinder');
  const sortiert = freigabenFuer(id)
    .filter(relevant)
    .sort((a, b) => {
      if (!profil.bereich) return 0;
      return ART_REIHENFOLGE.indexOf(bewerte(a, profil.bereich, profil.qualifikation).art) - ART_REIHENFOLGE.indexOf(bewerte(b, profil.bereich, profil.qualifikation).art);
    });
  const regelnFuer = (fr: Freigabe) =>
    regeln.filter((r) => r.kontext === fr.kontext && (fr.zielgruppe === 'alle' || r.zielgruppe === fr.zielgruppe || r.zielgruppe === 'alle'));
  const ohneTabelle = regeln.filter((r) => !freigabenFuer(id).some((fr) => fr.kontext === r.kontext));
  const a = m?.abschnitte;
  const fav = favoriten.includes(route);

  return (
    <Seite>
      <Stack.Screen
        options={{
          title: name,
          headerRight: () => (
            <Pressable onPress={() => schalteFavorit(route)} hitSlop={12} accessibilityLabel={fav ? 'Favorit entfernen' : 'Als Favorit merken'}>
              <Ionicons name={fav ? 'star' : 'star-outline'} size={24} color={fav ? f.gelb : f.text} />
            </Pressable>
          ),
        }}
      />
      <T art="gross">{name}</T>
      {m ? (
        <View style={{ gap: 2, marginTop: 4 }}>
          <T leise>{a?.wirkstoff?.map((p) => p.text).join(' ')}</T>
          <T leise>{a?.gruppe?.map((p) => p.text).join(' ')}</T>
          <T style={{ fontWeight: '700' }}>{a?.konzentration?.map((p) => p.text).join(' ')}</T>
        </View>
      ) : (
        <Hinweis>{zusatzmedikamente.find((z) => z.id === id)?.hinweis ?? 'Keine eigene SAA im Kompendium.'}</Hinweis>
      )}

      {m ? (
        <Karte style={{ marginTop: abstand.l, borderColor: f.rot, borderWidth: 2 }}>
          <View style={{ flexDirection: 'row', gap: abstand.s, alignItems: 'center' }}>
            <Ionicons name="warning" size={20} color={f.rot} />
            <T art="untertitel" farbe={f.rot}>Keine Anwendung, wenn</T>
          </View>
          <Punkte punkte={a?.keineAnwendung} warnung />
          {a?.altersbegrenzung?.length ? (
            <T art="klein" style={{ marginTop: 4 }}>
              <T art="klein" style={{ fontWeight: '700' }}>Altersbegrenzung: </T>
              {a.altersbegrenzung.map((p) => p.text).join(' ')}
            </T>
          ) : null}
          <T art="klein" leise>Für NotSan ohne (tele-)notärztliche Unterstützung absolute Kontraindikationen (S. 46).</T>
        </Karte>
      ) : null}

      {regeln.length ? (
        <View style={{ marginTop: abstand.l }}>
          <PatientLeiste hinweisIdealgewicht={id === 'fentanyl'} />
        </View>
      ) : null}

      <Abschnitt titel={profil.bereich ? 'Dosierung & Freigabe in deinem Bereich' : 'Dosierung & Freigaben'}>
        {sortiert.length === 0 ? <T leise>{`Keine Freigabetabelle für ${patient.erwachsen ? 'Erwachsene' : 'Kinder'} im Kompendium.`}</T> : null}
        {sortiert.map((fr) => <FreigabeKarte key={fr.tabelle} freigabe={fr} regeln={regelnFuer(fr)} />)}
        {ohneTabelle.length ? (
          <Karte>
            <T art="untertitel">Laut SAA</T>
            {ohneTabelle.map((r) => <T key={r.id} art="klein" leise>{`${r.kontext}: siehe SAA S. ${r.seite}`}</T>)}
          </Karte>
        ) : null}
      </Abschnitt>

      {m ? (
        <Abschnitt titel={`SAA ${m.name}`}>
          <Aufklapper titel="Indikationen" offen anzahl={a?.indikationen?.length}><Punkte punkte={a?.indikationen} /></Aufklapper>
          {a?.nutzenRisiko?.length ? (
            <Aufklapper titel="Anwendung nach Nutzen-Risiko-Abwägung" anzahl={a.nutzenRisiko.length}><Punkte punkte={a.nutzenRisiko} /></Aufklapper>
          ) : null}
          <Aufklapper titel="Durchführung / Dosierung (SAA)"><Punkte punkte={a?.dosierung} /></Aufklapper>
          <Aufklapper titel="Unerwünschte Wirkungen / Risiken" anzahl={a?.uaw?.length}><Punkte punkte={a?.uaw} /></Aufklapper>
          {a?.besonderheiten?.length ? <Aufklapper titel="Besonderheiten"><Punkte punkte={a.besonderheiten} /></Aufklapper> : null}
          <T art="klein" farbe={f.ergaenzung} style={{ fontStyle: 'italic' }}>
            Kursiv-blau: Ergänzung des Gemeinsamen Kompendiums gegenüber den SAA/BPR der 6-Länder-AG.
          </T>
          <Quelle seite={m.seite} text={`SAA ${m.name}`} />
        </Abschnitt>
      ) : null}
    </Seite>
  );
}
