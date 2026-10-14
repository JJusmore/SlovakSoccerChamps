# Slovak Soccer Champs

Futbalová manažérska hra v štýle World Soccer Champs – iba slovenská pyramída od Niké ligy po 9. ligu.

## Spustenie

Spusti `./start.sh` a otvor http://localhost:8080. Server (`server.py`) posiela hlavičky bez cache, takže prehliadač vždy načíta najnovšiu verziu. Netreba nič inštalovať.
Hra sa ukladá automaticky do prehliadača (localStorage); v nastaveniach (⚙) môžeš uloženie exportovať/importovať.

## Čo v hre je

- **9 líg**: Niké liga (12), 2. liga (16), 3. – 9. liga v skupinách Západ / Stred / Východ (spolu 324 klubov).
- **Reálni hráči** v Niké lige a 2. lige (súpisky podľa Wikipédie, stav august – september 2026). Hodnotenia a vek sú herné odhady.
- 3. liga má reálne kluby 2026/27, kluby 4. – 9. ligy sú z reálnych obcí, hráči v nich sú vymyslení.
- Postupy a zostupy, B-tímy nemôžu hrať súťaž s A-tímom, Niké liga s nadstavbou po 22. kole.
- **Skutočné súpisky zahraničných klubov**: všetkých 52 klubov (Real Madrid, Barcelona, Bayern, Slavia, Sparta, Ferencváros…) má skutočných hráčov podľa sezóny 2025/26 aj so skutočnými postmi (hodnotenia a vek sú herné odhady). Kádre sa potom vyvíjajú simulovane – odchovanci a náhrady sú vymyslení.
- **Presné posty**: každý hráč má post (B, SO, ĽO, PO, DZ, SZ, OZ, ĽZ, PZ, ĽK, PK, ÚT) a prípadne vedľajší. Na svojom poste hrá naplno, na príbuznom (napr. krídlo ↔ krajný záložník) o 3 – 10 % slabšie, mimo postu výrazne slabšie. Auto zostava a AI kluby stavajú hráčov na ich posty a vyberajú formáciu podľa kádra. Slovenským hráčom sa post odvodil z ich štýlu a atribútov.
- **Európske poháre**: Liga majstrov, Európska liga a Konferenčná liga (16 klubov, 4 skupiny, štvrťfinále, semifinále, finále). Majster Niké ligy ide do Ligy majstrov, víťaz pohára do Európskej ligy, ďalšie dva kluby do Konferenčnej ligy. Hrá v nich 52 zahraničných klubov (reálne názvy, vymyslení hráči) – nemajú ligu, ich kádre sa vyvíjajú simulovane, kupujú slovenské talenty a ty môžeš kupovať od nich (filter Súťaž → Zahraničie). Za účasť, výhry a postup sú veľké prémie.
- **Poháre**:
  - **Slovak Classic**: najväčší turnaj na Slovensku pre všetky kluby od Niké ligy po 9. ligu. V prvých kolách hrajú kluby so súpermi podobnej sily, za každé víťazné kolo je prémia a za vyradenie klubu z vyššej ligy bonus, finále je na Národnom štadióne.
  - **Slovenský pohár**: 64 klubov, nižšie postavený je domáci, penalty.
  - **Superpohár**: majster proti víťazovi pohára.
  - **Regionálne poháre ZsFZ, SsFZ a VsFZ**: pre kluby 4. – 9. ligy.
- **Fanúšikovia a rivalita**: každý klub má temperament fanúšikov (🔥 až 🔥🔥🔥🔥🔥). Skutočné derby (Slovan – Trnava, Košice – Prešov, bratislavské, liptovské, zemplínske…) aj susedské a mestské derby majú úvodnú animáciu, viac divákov a väčší vplyv na náladu. Nálada fanúšikov (😡 – 😍) ovplyvňuje návštevnosť a predaj suvenírov, pri zlej nálade prichádzajú protesty. Pri rizikových zápasoch hrozí pyrotechnika, bitky a výtržnosti s pokutami, zatvoreným sektorom alebo zápasom bez divákov.
- **Karty**: hráči majú agresivitu, tvrdé tímy a derby prinášajú viac kariet. Žlté a červené karty v živom zápase (vylúčený hráč odíde a tím hrá v oslabení), druhá žltá = červená, 4 žlté = stop na zápas, červená = 1 – 3 zápasy. Tabuľka disciplíny v Štatistikách.
- **Hodnotenia výkonov** (1 – 10) pre každého hráča v každom zápase: góly, asistencie, karty, čisté konto, výsledok. Po zápase vidíš hodnotenia svojich hráčov aj súpera a hráča zápasu (★). V profile hráča je priemer sezóny, forma z posledných 5 zápasov a tabuľka sezón (klub, zápasy, góly, asistencie, karty, Ø hodnotenie). V Štatistikách sú najlepšie hodnotení hráči ligy.
- **Zranenia** (7 druhov – od pomliaždeniny po pretrhnuté väzy, 1 – 45 hracích dní). Riziko zvyšuje nízka kondícia, vysoký presing, tvrdý súper a vek, znižuje ho zdravotné stredisko (aj kratšie liečenie). Regeneračné centrum zrýchľuje návrat. V živom zápase zranený hráč odíde a nastúpi náhradník. Zranení sú v záložke Tím a nemôžu hrať.
- **Súhrn po zápase**: priebeh zápasu podľa minút (góly s asistenciami, žlté a červené karty, polčas), počet divákov a koľko z nich boli tvoji fanúšikovia, štatistiky (strely, držanie lopty, karty).
- **Mimoriadne udalosti** (27 druhov): koncerty, mestské slávnosti, kemp pre deti, návšteva legendy, natáčanie seriálu, turnaj v zahraničí, vianočný večierok, ale aj búrka, havária v šatniach či kontrola licencie. Každá má 2 – 3 možnosti s vypísanými následkami (peniaze, fanúšikovia, diváci, kondícia, skúsenosti mladých, objavenie talentu). Pri problémoch sa po vypršaní stane horšia možnosť.
- **Pošta** s filtrami (udalosti, ponuky, skauti, klub) a sekciou „Čaká na tvoje rozhodnutie“.
- **Animácie**: filmový úvod pred pohárovými a európskymi zápasmi a pred derby (kamera ide tunelom za hráčmi, výbeh na štadión, detail trofeje alebo erbov). Beží plynulo na 60 fps, na slabšom počítači sa samo zníži rozlíšenie. Oslava s ohňostrojom pri zisku trofeje, titulu aj postupe.
- Zostava a 9 formácií (hráčov presúvaš ťahaním, klik otvorí detail), mentalita, presing, kondícia, mládež, starnutie hráčov.
- **Auto zostava** rozdelí hráčov podľa toho, čo daný post potrebuje (krídlo = rýchlosť a silnejšia noha na svojej strane, stopér = obrana a fyzička, hrotový útočník = streľba…), unavených nahradí a poradí lepšiu formáciu.
- **Akadémia** (tretí panel v záložke Tím): 5 miest pre hráčov do 21 rokov. Rastú tu rýchlejšie ako na lavičke, ale nehrajú zápasy. Ročník trvá jednu sezónu, potom ide hráč sám na lavičku a nastúpi prvý z **čakárne** (2 miesta, hráči v nej ešte hrajú). Rýchlosť rastu zvyšuje Mládežnícka akadémia.
- **Skúsenosti z ihriska**: každý odohraný zápas pridá skúsenosti (vo vyššej lige viac). Nováčik hrá o 6 % slabšie, ostrieľaný hráč o 2 % lepšie a hráči v zostave sa aj najrýchlejšie zlepšujú.
- **Atribúty hráčov** (rýchlosť, streľba, prihrávky, technika, obrana, fyzička; brankári reflexy, chytanie…) – ovplyvňujú zápasy.
- **Profil hráča**: štýl hry (tiki-taka, dlhé lopty, kľučkár, tank, lovec gólov, sweeper keeper…), silnejšia noha, slabšia noha a triky (1 – 5 ★), vedľajšie posty (hrá tam len o 6 % slabšie) a špeciality v troch úrovniach (bronz, striebro, zlato) – napr. zakončovateľ, hlavičkár, strela zďaleka, kľučkár, šprintér, líder, chytač penált. Všetko sa prejavuje v zápase.
- **Tréningové podmienky**: každý klub má kvalitu tréningu (tvoj klub = úroveň tréningového centra, ostatné podľa ligy a veľkosti, zahraničné kluby až 5). Keď hráč príde do klubu s lepšími podmienkami, než mal doteraz (napr. z dediny do mesta), stúpne mu potenciál – mladým najviac (do 19 rokov), po 27 rokoch už nie. Stavba tréningového centra zvýši potenciál aj hráčom v klube (polovičný efekt). V profile hráča vidíš odhad (Tréning u teba), v zoznamoch odznak 🏋️.
- **Realistické potenciály**: potenciál zodpovedá úrovni klubu a ligy. Klenoty sú vzácne a silní hráči nejdú do slabých klubov, takže tím treba budovať postupne.
- **Skauting** (ťažší): cielené skautovanie trvá niekoľko dní (v zahraničí dlhšie), misie nájdu len 0 – 2 hráčov za deň. Skauti môžu chodiť aj do zahraničia – celé zahraničie alebo konkrétna krajina (cestovné navyše). Hviezdy svetových klubov sú známe, ostatní zahraniční hráči nie.
  - neznámi hráči majú len odhad sily; skauti (1 – 5 ★) s misiami zisťujú silu, atribúty a potenciál. Sledovaní hráči.
- **Realistický trh**: hodnota hráča rastie nad úrovňou Niké ligy strmo (sila 70 ≈ 1,7 mil. €, 80 ≈ 15 mil. €, 88 ≈ 75 mil. €), hviezdy si pýtajú vysoké platy. Dobrí hráči s končiacou zmluvou sa väčšinou dohodnú na novej, alebo hneď prestúpia zadarmo do klubu svojej úrovne (silní aj do zahraničia). Voľní hráči sú preto väčšinou slabší alebo starší a tí dobrí si pýtajú podpisové (až 30 % hodnoty). AI kluby počas okna podpisujú voľných hráčov a kluby 1. – 3. ligy aj zahraničné na začiatku každého okna kupujú posilu na najslabší post.
- **Prestupy**: letné a zimné okno, vyjednávanie s protiponukami, výmeny hráčov, osobné podmienky (plat, zmluva), hosťovania tam aj späť, voľní hráči.
- **Ponuky od klubov** na tvojich hráčov do Pošty (prijať / protiponuka / odmietnuť), predajný zoznam, rýchly predaj.
- **Zmluvy a financie**: platy, prémie, história prestupov a rekordy.
  - Prehľad ukazuje rozpočet jedného kola (príjmy a výdavky podľa druhu), finančné zdravie A – E s radami, odhad rozpočtu na konci sezóny a zisk podľa sezón.
  - Výdavky: platy, prevádzka klubu, organizácia domácich zápasov (podľa počtu divákov) a údržba areálu (0,2 % hodnoty zariadení za kolo).
- **Biznis klubu**: 5 sponzorských zmlúv (hlavný sponzor, výrobca dresov, názov štadióna, 2 partneri) s rôznymi typmi odmien a vyjednávaním; cena lístkov, permanentky, občerstvenie, fanúšikovia, suveníry, TV práva, dotácie, prémie v pohári, mimoriadne ponuky.
- **Zariadenia klubu** (26 druhov): 3D areál, ktorý rastie s každou stavbou – štadión (15 úrovní: od 6. úrovne horná tribúna, úrovne 8 – 15 veľký štadión až na 50 000 miest – vyššie tribúny, strecha, LED pás a oblúk nad štadiónom), zastrešenie tribún, moderné sedadlá s mozaikou klubu, LED mantinely, fasáda a vstup, fanúšikovský kotol, rodinná zóna, osvetlenie a obrazovka, VIP lóže, parkovisko, vyhrievaný trávnik, fanzóna, tréningové centrum, regeneračné centrum, mládežnícka akadémia, internát, skautingová sieť, videoanalytika, zdravotné stredisko, fanshop, občerstvenie, marketing, klubové múzeum, reštaurácia, mediálne centrum a solárne panely. Stavby trvajú niekoľko hracích dní (najviac 2 naraz).
- **Vedenie klubu** (Klub → Vedenie): cieľ sezóny podľa sily kádra, dôvera vedenia (výsledky, derby, miesto v tabuľke, financie), rozpočet na platy – nad limit nepodpíšeš nikoho. Pri nízkej dôvere ťa vedenie odvolá a dostaneš ponuky zo slabších klubov, po úspechu prídu ponuky z väčších klubov (tréner môže zmeniť klub).
- **Zmluva s vedením a úlohy** (Klub → Vedenie, na začiatku sezóny aj na Prehľade): vedenie navrhne rozpočet na prestupy (nákupy, podpisové, provízie a hosťovania; polovica z predajov sa vráti), limit platov a tvoj plat s prémiou za každú splnenú úlohu. Môžeš rokovať o viac – čím viac pýtaš, tým prísnejší cieľ alebo povinné úlohy navyše (pri prehnaných požiadavkách vedenie odmietne, po 3 pokusoch platí jeho návrh). Úlohy na sezónu podľa majiteľa: hlavný cieľ v lige a 3 ďalšie (postup v pohári, góly, návštevnosť, mladí hráči, Slováci v kádri, predaje, sezóna bez straty, platy pod limitom, derby, Európa, zariadenie) s priebehom, prémiou a postihom; povinné úlohy výrazne menia dôveru. Tvoje úspory z platu a prémií sa sčítavajú cez celú kariéru.
- **Mafia** (záložka 🕶️ Mafia): kontakt v podsvetí podľa mesta (dedinská partia, mestská skupina, veľká rodina v krajskom meste – tam si môžeš aj zavolať za poplatok). Služby: čierne peniaze (treba vrátiť s úrokom), fiktívny sponzor, kúpený rozhodca, zastrašenie súpera, kúpený zápas, lacnejšie prestupy, stavebné povolenie, umlčanie novinárov, známy na polícii. Za pomoc chcú protislužby (podiel, ich hráč s vysokým platom, ich človek v klube, prehratý zápas, lacný predaj hráča, ich stavebná firma) – odmietnutie zhorší vzťah a hrozia útoky (zdemolované šatne, vyhrážky, napadnutý hráč, udavač). Pozornosť polície rastie tým rýchlejšie, čím vyššia liga (Niké liga ×2, 9. liga ×0,55). Vyšetrovanie vedie k súdu: advokát, priznanie alebo zapieranie, trest podľa dôkazov – pokuta, odpočet bodov, zákaz prestupov, preradenie o jednu či dve súťaže nižšie, až zrušenie klubu.
- **Licencie SFZ a UEFA**: Niké liga vyžaduje osvetlenie a akadémiu (inak pokuta a −3 body), Európa aj štadión úrovne 2, osvetlenie úrovne 2 a zdravotné stredisko. Dlhy = odpočet bodov. AI kluby sa dostávajú do finančných problémov (odpočet bodov, výpredaj), niektoré skrachujú.
- **Morálka a rozhovory**: hráči sú spokojní, keď hrajú a vyhrávajú; kľúčový hráč na lavičke stráca morálku a môže žiadať prestup. Rozhovor (pochvala, kritika, sľub miesta v základe, upokojenie) – nesplnený sľub hráča nahnevá.
- **Agenti a klauzuly**: provízia agenta pri prestupe, podpise aj predĺžení, výstupná klauzula (klub, ktorý ju zaplatí, hráča kúpi bez tvojho súhlasu) a bonus za gól – za klauzuly hráč zľaví z platu. Pri predaji si môžeš vypýtať 15 % z ďalšieho predaja.
- **Chémia a kapitán**: spoločný jazyk v šatni, nováčikovia, kapitán (líder), morálka a taktický tréning ovplyvňujú výkon tímu.
- **Reprezentácia**: po 7., 14. a 24. kole zraz Slovenska a U21 – výsledky, strelci, únava, občas zranenie; reprezentant má vyššiu hodnotu.
- **Tréning** (záložka Tréning): týždenný plán – 5 tréningov (taktika, útok, obrana, technika, kondícia, štandardky, regenerácia, voľno) so záťažou: veľa = únava a zranenia, málo = pomalší rozvoj. Zohratosť rastie s taktikou a klesá pri zmene formácie či štýlu. Tímové perky (bronz/striebro/zlato) za body z tréningov: Kanonieri, Betón, Zohratý stroj, Technická škola, Železné pľúca, Majstri štandardiek. Individuálny tréning: nový post, slabšia noha, triky, atribút a špeciality (podľa atribútu, nemusí vyjsť).
  - realizačný tím: asistent, tréner brankárov, kondičný tréner, lekár (1 – 5 ★, každý post sa dá rozkliknúť), intenzita tréningu.
- **Taktika a štandardky**: štýl (držanie lopty, priame lopty, protiútoky), šírka, línia obrany; exekútori penált, priamych kopov a rohov. AI reaguje na tvoju taktiku. Pred zápasom analýza súpera (forma, kľúčový hráč, jeho taktika, slabina) a odporúčanie asistenta.
- **Počasie a terén**: slnko, dážď, búrka, hmla, sneh, mráz, horúčava, vietor podľa ročného obdobia (aj v živom zápase), umelá tráva v nižších ligách, vyhrievaný trávnik. **Rozhodcovia** s rôznou prísnosťou, **VAR** v Niké lige a Európe (ruší góly). **Cestovanie**: dlhé cesty na východ či západ unavia hostí.
- **Tlačové konferencie** pred derby a veľkými zápasmi aj po výrazných výsledkoch – odpovede menia morálku, náladu fanúšikov, dôveru vedenia aj motiváciu súpera.
- **Mládež a ženy** (Klub → Mládež a ženy): dorastenecká liga U19 s tabuľkou a strelcami, letný medzinárodný turnaj dorastu, B-tím v najnižšej súťaži regiónu (presúvanie hráčov medzi A a B), ženský tím v lige žien.
- **História** (Klub → História): rok založenia a výročia, retro dres (viac suvenírov), rekordy klubu, Sieň slávy (100+ zápasov alebo 35+ gólov), kariéra trénera po kluboch.
- **Šatňa cez polčas** v živom zápase: pochváliť, zvýšiť hlas alebo pokojne – ovplyvní morálku a šance v 2. polčase.
- **Sústredenie** (Prehľad, na začiatku sezóny a v zimnom okne): doma, Rakúsko alebo Turecko – 2 prípravné zápasy, chémia, kondícia, rozvoj.
- **Správa skauta** v profile hráča (silné a slabé stránky, špeciality, potenciál, porovnanie s tvojím hráčom na poste).
- **Forma**: hodnota hráča rastie a klesá podľa posledných hodnotení, hráč vo forme láka ponuky, chce vyšší plat (inak je nespokojný) a niekedy si stavia hlavu (horšia chémia, pomôže kritika).
- **Osobné udalosti**: stesk za domovom, rodinné problémy, svadba, otcovstvo, choroba, maturita, párty, charita.
- **Sociálne siete** po zápase: reakcie fanúšikov a médií, pri sérii prehier #trénervon a tlak na vedenie.
- **Majiteľ klubu**: investor (peniaze, ale netrpezlivý), mesto (málo peňazí, trpezlivé, pomôže s dotáciou), fanúšikovia (ich nálada = dôvera), generálny sponzor.
- **Stavebné povolenie a dotácie**: od 3. úrovne štadióna treba povolenie (môže byť zamietnuté), dotácia od mesta alebo ministerstva zníži cenu o 20 – 40 %.
- **Podrobné štatistiky**: xG, veľké šance, rohy, prihrávky a ich presnosť, súboje, mapa striel oboch tímov a heatmapa hráča (zo živého zápasu presná).
- **Trénerské licencie** UEFA C – Pro (kurzy stoja peniaze a čas, vyššie súťaže ich vyžadujú) a **kariérne ciele** (12 cieľov v Klub → História).
- **Talenty z okresných turnajov**: skauti pri otvorení okna nájdu mladíkov v 7. – 9. lige (lepšia skautingová sieť = viac), podpíšeš ich za výchovné.
- **Predzmluvy**: v zimnom okne podpíšeš hráča, ktorému končí zmluva – po sezóne príde zadarmo.
- **Simulovať viac zápasov** (⏩ na Prehľade aj pred zápasom): 3, 5, 10 zápasov alebo do konca sezóny. Vždy sa odohrá presne zvolený počet zápasov. Voliteľne auto zostava pred každým zápasom a udalosti, ktoré rozhodne asistent (vyberie najvýhodnejšiu možnosť); ponuky na hráčov počkajú v Pošte. Simulácia sa dá kedykoľvek zastaviť. Na konci je súhrn: výhry, remízy, prehry, skóre, posun v tabuľke, zmena rozpočtu, zranenia, všetky zápasy so strelcami a hráčom zápasu a najlepšie hodnotení hráči. Pri zisku trofeje príde oslava.
- Živé zápasy: šance hráš sám – **potiahni** = strela (oblúk = falš), **klik** na spoluhráča = prihrávka, **podrž** / **šípky** = beh, **medzerník** = strela, **P** = pauza a striedania.
- Na mobile na výšku sa ihrisko otočí zvislo.

## Súbory

- `js/data/squads.js` – reálne súpisky Niké ligy a 2. ligy (tu môžeš upraviť hráčov a hodnotenia)
- `js/data/world.js` – štruktúra líg, kluby 3. ligy, obce, mená, formácie
- `js/core.js` – generovanie sveta, hráči, kluby, zostavy
- `js/season.js` – rozpis, tabuľky, simulácia, koniec sezóny, ukladanie
- `js/data/europe.js` – zahraničné kluby a mená hráčov podľa krajín
- `js/euro.js` – európske poháre (žreb, skupiny, vyraďovačka, prémie, prestupy do zahraničia)
- `js/ui_euro.js` – európske poháre v záložke Poháre
- `js/cups.js` – poháre (Slovak Classic, Slovenský pohár, Superpohár, regionálne poháre), žreby a prémie
- `js/ceremony.js` – úvodné animácie pohárov, oslavy trofejí, ohňostroj a konfety
- `js/market.js` – atribúty, zmluvy, skauting, vyjednávanie, hosťovania, financie, pošta
- `js/biz.js` – sponzori, vstupné, štadión, fanúšikovia, zariadenia a stavby
- `js/events.js` – mimoriadne udalosti klubu a ich následky
- `js/career.js` – majiteľ, stavebné povolenie a dotácie, licencie trénera, kariérne ciele, sústredenie, talenty z okresov, predzmluvy
- `js/life.js` – osobné udalosti, forma a požiadavky na plat, sociálne siete, správy skautov, šatňa cez polčas, xG a heatmapa
- `js/data/europe_squads.js` – skutočné súpisky zahraničných klubov
- `js/positions.js` – presné posty hráčov a vhodnosť na post
- `js/mafia.js` – mafia: kontakty, služby, protislužby, polícia, súd a tresty
- `js/ui_mafia.js` – záložka Mafia a súd
- `js/board.js` – zmluva s vedením, rokovanie, rozpočet na prestupy, úlohy na sezónu
- `js/club.js` – vedenie, licencie, dlhy, B-tím, dorast U19, ženský tím, Sieň slávy, rekordy, výročia
- `js/people.js` – morálka, rozhovory, sľuby, agenti a klauzuly, chémia a kapitán, reprezentácia
- `js/training.js` – tréningový plán, individuálny tréning, realizačný tím
- `js/matchday.js` – taktika, štandardky, počasie, rozhodcovia a VAR, cestovanie, tlačovky, analýza súpera
- `js/ui_club.js` – obrazovky Klub, Tréning, rozhovory, tlačovky
- `js/ratings.js` – hodnotenia výkonov hráčov, zranenia a história sezón
- `js/fans.js` – temperament a nálada fanúšikov, derby, výtržnosti, karty a tresty
- `js/campus.js` – kreslenie 2D areálu klubu
- `js/ui_finance.js` – záložka Financie (prehľad, sponzori, štadión a vstupné, investície)
- `js/ui_transfers.js` – prestupová stránka (trh, filtre, odporúčania, porovnanie)
- `js/ui_market.js` – profil hráča, vyjednávanie, trh, skauting, financie, pošta
- `js/match.js` – živý zápas (fyzika, AI, ovládanie, vykresľovanie, zvuk)
- `js/art.js` – postavičky, lopta, erby, trofeje
- `js/ui.js` – obrazovky a menu
- `js/ui_sim.js` – simulácia viacerých zápasov naraz a súhrn
- `js/ui_team.js` – záložka Tím (ihrisko s postavičkami, lavička, ťahanie hráčov)
