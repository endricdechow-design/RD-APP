import { bereich, bpr } from '@/data/kompendium';
import { QUALI_NAME } from '@/logic/freigabe';
import { useApp } from '@/state/AppState';
import { Abschnitt, Hinweis, Seite, T, Zeile } from '@/ui/bausteine';

export default function Mehr() {
  const { profil, abo } = useApp();
  return (
    <Seite>
      <Abschnitt titel="Ich">
        <Zeile
          titel="Profil"
          untertitel={`${QUALI_NAME[profil.qualifikation]} · ${profil.bereich ? bereich(profil.bereich)?.name : 'kein Bereich'}`}
          icon="person-circle"
          route="/profil"
        />
        <Zeile titel={abo === 'pro' ? 'Nodexo Pro – aktiv' : 'Nodexo Pro'} untertitel="Unbegrenzt lernen, Prüfungssimulation, Lernplan" icon="star" route="/abo" />
      </Abschnitt>
      <Abschnitt titel="Werkzeuge">
        <Zeile titel="Scores: NEWS2 · qSOFA · Schockindex" icon="calculator" route="/scores" />
        <Zeile titel="Praktische Fallbeispiele" icon="people" route="/praxis" />
      </Abschnitt>
      <Abschnitt titel="Grundlagen & Recht">
        {bpr.filter((b) => b.kategorie === 'grundlagen').map((b) => (
          <Zeile key={b.id} titel={b.titel} icon="document-text" route={`/bpr/${b.id}`} />
        ))}
      </Abschnitt>
      <Abschnitt titel="Über Nodexo">
        <Hinweis art="warnung">
          Nodexo ist ein Nachschlage- und Lernwerkzeug. Es ersetzt weder Ausbildung, Kompendium noch die Vorgaben deiner ÄLRD und trifft keine Therapieentscheidung.
        </Hinweis>
        <T art="klein" leise>
          Datenbasis: Gemeinsames Kompendium Rettungsdienst 2026 (28 Gebietskörperschaften / Partner, NRW). Alle Texte wörtlich übernommen, die Originalseite ist jeweils unten eingeblendet; Ergänzungen des Kompendiums gegenüber den SAA/BPR der 6-Länder-AG sind kursiv-blau markiert.
        </T>
      </Abschnitt>
    </Seite>
  );
}
