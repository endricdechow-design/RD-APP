import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { fragenpool, nachThema, THEMEN, type Thema } from '@/logic/lernen/fragen';
import { fortschritt, lernplan, MODI, serie, type Modus } from '@/logic/lernen/training';
import { BASIS_TAGESFRAGEN, useApp } from '@/state/AppState';
import { Abschnitt, Chip, Hinweis, Karte, Knopf, Seite, T } from '@/ui/bausteine';
import { abstand, radius, useFarben } from '@/ui/theme';

function Balken({ anteil, farbe }: { anteil: number; farbe: string }) {
  const f = useFarben();
  return (
    <View style={{ height: 8, backgroundColor: f.flaecheHoch, borderRadius: 4, overflow: 'hidden' }}>
      <View style={{ height: 8, width: `${Math.round(anteil * 100)}%`, backgroundColor: farbe }} />
    </View>
  );
}

export default function Lernen() {
  const f = useFarben();
  const { profil, lernstand, abo, einstellungen, fragenHeute } = useApp();
  const pool = useMemo(() => fragenpool({ qualifikation: profil.qualifikation, bereich: profil.bereich ?? undefined }), [profil]);
  const [jetzt] = useState(() => Date.now());
  const fp = fortschritt(pool, lernstand, jetzt);
  const tage = serie(lernstand, jetzt);
  const [themen, setThemen] = useState<Thema[]>([]);
  const plan = einstellungen.pruefungsdatum ? lernplan(fp, einstellungen.pruefungsdatum, jetzt) : null;

  const starte = (modus: Modus) => {
    const m = MODI.find((x) => x.id === modus)!;
    if (m.pro && abo !== 'pro') return router.push('/abo');
    router.push({ pathname: '/quiz', params: { modus, themen: themen.join(',') } });
  };

  return (
    <Seite>
      <View style={{ flexDirection: 'row', gap: abstand.m }}>
        <Karte style={{ flex: 1 }}>
          <T art="klein" leise>SERIE</T>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="flame" size={26} color={tage > 0 ? f.gelb : f.grau} />
            <T art="gross">{tage}</T>
          </View>
          <T art="klein" leise>{tage === 1 ? 'Tag' : 'Tage'} am Stück</T>
        </Karte>
        <Karte style={{ flex: 1 }}>
          <T art="klein" leise>SICHER GEWUSST</T>
          <T art="gross">{`${fp.sicher}`}</T>
          <T art="klein" leise>{`von ${fp.gesamt} Fragen`}</T>
        </Karte>
      </View>

      <Karte style={{ marginTop: abstand.m }}>
        <T art="untertitel">Dein Stoff</T>
        <T art="klein" leise>{`${fp.gesehen} von ${fp.gesamt} Fragen gesehen · ${Math.round(fp.quote * 100)} % richtig · ${fp.faellig} zur Wiederholung fällig`}</T>
        <Balken anteil={fp.gesamt ? fp.gesehen / fp.gesamt : 0} farbe={f.akzent} />
        <Balken anteil={fp.gesamt ? fp.sicher / fp.gesamt : 0} farbe={f.gruen} />
        {plan ? (
          <T art="klein">{`Prüfung in ${plan.tage} Tagen – plane ${plan.neueProTag} neue Fragen pro Tag.`}</T>
        ) : (
          <Knopf titel="Prüfungsdatum festlegen" art="umriss" icon="calendar" onPress={() => router.push('/profil')} style={{ minHeight: 44 }} />
        )}
      </Karte>

      <Abschnitt titel="Lernmodus">
        {MODI.map((m) => (
          <Karte key={m.id} onPress={() => starte(m.id)}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: abstand.m }}>
              <Ionicons
                name={{ gemischt: 'shuffle', themen: 'list', faellig: 'repeat', fehler: 'bug', pruefung: 'ribbon' }[m.id] as never}
                size={26}
                color={f.akzent}
              />
              <View style={{ flex: 1 }}>
                <T art="untertitel">{m.name}</T>
                <T art="klein" leise>{m.beschreibung}</T>
              </View>
              {m.pro && abo !== 'pro' ? (
                <View style={{ backgroundColor: f.gelb, borderRadius: radius.s, paddingHorizontal: 8, paddingVertical: 2 }}>
                  <T art="klein" farbe="#000" style={{ fontWeight: '800' }}>PRO</T>
                </View>
              ) : null}
            </View>
          </Karte>
        ))}
      </Abschnitt>

      <Abschnitt titel="Themen auswählen (für „Nach Themen“)">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: abstand.s }}>
          {THEMEN.map((t) => {
            const n = nachThema(pool, [t.id]).length;
            const aktiv = themen.includes(t.id);
            return (
              <Chip
                key={t.id}
                titel={`${t.name} (${n})`}
                aktiv={aktiv}
                onPress={() => setThemen(aktiv ? themen.filter((x) => x !== t.id) : [...themen, t.id])}
              />
            );
          })}
        </View>
        {!profil.bereich ? <Hinweis>Fragen zu Freigaben gibt es, sobald du im Profil deinen Bereich wählst.</Hinweis> : null}
      </Abschnitt>

      {abo !== 'pro' ? (
        <T art="klein" leise style={{ marginTop: abstand.l }}>
          {`Basis: ${Math.max(0, BASIS_TAGESFRAGEN - fragenHeute())} von ${BASIS_TAGESFRAGEN} Fragen heute übrig.`}
        </T>
      ) : null}
      <T art="klein" leise style={{ marginTop: abstand.s }}>
        {`${pool.length} Fragen für ${profil.qualifikation === 'RS' ? 'Rettungssanitäter/innen' : 'Notfallsanitäter/innen'} – jede mit Quellseite im Kompendium.`}
      </T>
    </Seite>
  );
}
