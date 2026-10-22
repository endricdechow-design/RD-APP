import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';

import { alleMedikamentNamen, dosisregelnFuer, freigabenFuer, medikament, regelnFuerFreigabe, zusatzmedikamente } from '@/data/kompendium';
import type { Freigabe } from '@/data/typen';
import { ART_REIHENFOLGE, bewerte } from '@/logic/freigabe';
import { useApp } from '@/state/AppState';
import { Abschnitt, Hinweis, Kasten, Punkte, Seite, T } from '@/ui/bausteine';
import { FreigabeKarte } from '@/ui/FreigabeKarte';
import { PatientLeiste } from '@/ui/PatientLeiste';
import { PdfSeiten } from '@/ui/PdfSeiten';
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
  const alleFreigaben = freigabenFuer(id);
  const passtZumPatienten = (fr: Freigabe) =>
    fr.zielgruppe === 'alle' || (patient.erwachsen ? fr.zielgruppe === 'erwachsene' : fr.zielgruppe === 'kinder');
  const freigaben = alleFreigaben.filter(passtZumPatienten).sort((a, b) => {
    if (!profil.bereich) return 0;
    const rang = (x: Freigabe) => ART_REIHENFOLGE.indexOf(bewerte(x, profil.bereich!, profil.qualifikation).art);
    return rang(a) - rang(b);
  });
  const a = m?.abschnitte;
  const fav = favoriten.includes(route);
  const text = (k: keyof NonNullable<typeof a>) => a?.[k]?.map((p) => p.text).join(' ') ?? '';

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

      <View style={{ gap: abstand.m }}>
        {m ? (
          <>
            <Kasten titel={name} farbe="blau">
              <Text style={{ color: '#111', fontSize: 16 }}>{text('wirkstoff')}</Text>
              <Text style={{ color: '#111', fontSize: 17, fontWeight: '800' }}>{text('konzentration')}</Text>
              <Text style={{ color: '#333', fontSize: 15 }}>{text('gruppe')}</Text>
            </Kasten>
            <Kasten titel="Indikationen" farbe="gelb">
              <Punkte punkte={a?.indikationen} aufHell />
            </Kasten>
            <Kasten titel="Keine Anwendung, wenn" farbe="rot">
              <Punkte punkte={a?.keineAnwendung} aufHell />
              {text('altersbegrenzung') ? (
                <Text style={{ color: '#111', fontSize: 16, marginTop: 4 }}>
                  <Text style={{ fontWeight: '800' }}>Altersbegrenzung: </Text>
                  {text('altersbegrenzung')}
                </Text>
              ) : null}
            </Kasten>
            {a?.nutzenRisiko?.length && text('nutzenRisiko') !== 'entfällt' ? (
              <Kasten titel="Nutzen-Risiko-Abwägung, wenn" farbe="orange">
                <Punkte punkte={a.nutzenRisiko} aufHell />
              </Kasten>
            ) : null}
            <Kasten titel="Durchführung / Dosierung" farbe="tuerkis">
              <Punkte punkte={a?.dosierung} aufHell />
            </Kasten>
          </>
        ) : (
          <Hinweis>{zusatzmedikamente.find((z) => z.id === id)?.hinweis.replace(/\s*\(S\.[^)]*\)/, '') ?? 'Keine eigene SAA im Kompendium.'}</Hinweis>
        )}
      </View>

      {alleFreigaben.length ? (
        <Abschnitt titel={profil.bereich ? 'Freigabe & Rechner für deinen Bereich' : 'Freigabe & Rechner'}>
          {regeln.length ? <PatientLeiste hinweisIdealgewicht={id === 'fentanyl'} /> : null}
          {freigaben.map((fr) => <FreigabeKarte key={fr.tabelle} freigabe={fr} regeln={regelnFuerFreigabe(fr)} />)}
          {freigaben.length === 0 ? <T leise>{`Keine Freigabe für ${patient.erwachsen ? 'Erwachsene' : 'Kinder'} im Kompendium.`}</T> : null}
        </Abschnitt>
      ) : null}

      {m ? (
        <View style={{ gap: abstand.m, marginTop: abstand.xl }}>
          <Kasten titel="Unerwünschte Wirkungen / Risiken" farbe="grau">
            <Punkte punkte={a?.uaw} aufHell />
          </Kasten>
          {a?.besonderheiten?.length ? (
            <Kasten titel="Besonderheiten" farbe="umriss">
              <Punkte punkte={a.besonderheiten} />
            </Kasten>
          ) : null}
          <T art="klein" farbe={f.ergaenzung} style={{ fontStyle: 'italic' }}>
            Blau kursiv: Ergänzung des Gemeinsamen Kompendiums gegenüber den SAA/BPR der 6-Länder-AG.
          </T>
        </View>
      ) : null}

      <PdfSeiten seiten={[...(m ? [m.seite] : []), ...alleFreigaben.map((fr) => fr.seite)]} />
    </Seite>
  );
}
