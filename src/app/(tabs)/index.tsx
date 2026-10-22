import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { bereich } from '@/data/kompendium';
import { QUALI_NAME } from '@/logic/freigabe';
import { eintraege, KATEGORIEN } from '@/logic/kategorien';
import { suche, titelFuerRoute } from '@/logic/suche';
import { useApp } from '@/state/AppState';
import { Chip, KASTEN, Seite, T, Zeile, type IconName } from '@/ui/bausteine';
import { abstand, radius, TOUCH, useFarben } from '@/ui/theme';

const RAND = { gruen: '#4CAF50', blau: '#5B8DEF', orange: '#F0922E', rot: '#E5484D', lila: '#9B7BEA' } as const;

export default function Start() {
  const f = useFarben();
  const { profil, favoriten } = useApp();
  const [eingabe, setEingabe] = useState('');
  const treffer = useMemo(() => suche(eingabe), [eingabe]);

  return (
    <Seite>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: abstand.s, height: TOUCH + 4, borderRadius: radius.m, borderWidth: 2, borderColor: f.akzent, backgroundColor: f.flaeche, paddingHorizontal: abstand.m }}>
        <Ionicons name="search" size={24} color={f.akzent} />
        <TextInput
          value={eingabe}
          onChangeText={setEingabe}
          placeholder="Suchen: Medikament, Maßnahme, Symptom …"
          placeholderTextColor={f.textLeise}
          style={{ flex: 1, color: f.text, fontSize: 18, minWidth: 0 }}
          autoCorrect={false}
          accessibilityLabel="Suche"
        />
        {eingabe ? (
          <Pressable onPress={() => setEingabe('')} accessibilityLabel="Suche leeren" hitSlop={12}>
            <Ionicons name="close-circle" size={24} color={f.textLeise} />
          </Pressable>
        ) : null}
      </View>

      {eingabe.length >= 2 ? (
        <View style={{ marginTop: abstand.s }}>
          {treffer.length === 0 ? <T leise style={{ marginTop: abstand.m }}>Nichts gefunden.</T> : null}
          {treffer.map((t) => (
            <Zeile
              key={t.route}
              titel={t.titel}
              untertitel={{ medikament: 'Medikament', massnahme: 'Invasive Maßnahme', bpr: 'Behandlungspfad' }[t.art]}
              route={t.route}
              icon={t.art === 'medikament' ? 'medkit' : t.art === 'massnahme' ? 'bandage' : 'git-branch'}
            />
          ))}
        </View>
      ) : (
        <>
          {favoriten.length > 0 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: abstand.s, marginTop: abstand.m }}>
              {favoriten.map((r) => <Chip key={r} titel={titelFuerRoute(r)} icon="star" onPress={() => router.push(r as never)} />)}
            </View>
          ) : null}

          <View style={{ gap: abstand.m, marginTop: abstand.l }}>
            {KATEGORIEN.map((k) => (
              <Pressable
                key={k.id}
                onPress={() => router.push(`/liste/${k.id}`)}
                accessibilityRole="button"
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: abstand.m,
                  minHeight: 72,
                  paddingHorizontal: abstand.l,
                  paddingVertical: abstand.m,
                  borderRadius: radius.m,
                  borderWidth: 2,
                  borderColor: RAND[k.farbe],
                  backgroundColor: pressed ? f.flaecheHoch : f.flaeche,
                })}>
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: KASTEN[k.farbe === 'rot' ? 'rot' : k.farbe], alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name={k.icon as IconName} size={22} color="#111" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: f.text, fontSize: 19, fontWeight: '800' }}>{k.titel}</Text>
                  <Text style={{ color: f.textLeise, fontSize: 13.5 }}>{k.untertitel}</Text>
                </View>
                <Text style={{ color: f.textLeise, fontSize: 14 }}>{eintraege(k.id).length}</Text>
                <Ionicons name="chevron-forward" size={20} color={f.textLeise} />
              </Pressable>
            ))}
            <Pressable
              onPress={() => router.push('/scores')}
              accessibilityRole="button"
              style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: abstand.s, minHeight: TOUCH, borderRadius: radius.m, borderWidth: 1, borderColor: f.rand, backgroundColor: pressed ? f.flaecheHoch : 'transparent' })}>
              <Ionicons name="calculator" size={20} color={f.text} />
              <Text style={{ color: f.text, fontSize: 16, fontWeight: '700' }}>Scores: NEWS2 · qSOFA · Schockindex</Text>
            </Pressable>
          </View>

          <Pressable onPress={() => router.push('/profil')} style={{ marginTop: abstand.l, alignSelf: 'center' }} accessibilityRole="button">
            <T art="klein" leise>{`${QUALI_NAME[profil.qualifikation]} · ${profil.bereich ? bereich(profil.bereich)?.name : 'kein Bereich gewählt'}`}</T>
          </Pressable>
        </>
      )}
    </Seite>
  );
}
