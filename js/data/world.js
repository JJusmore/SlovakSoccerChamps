'use strict';
// Štruktúra slovenskej futbalovej pyramídy v hre + podklady pre generovanie nižších líg.

const REGIONS = {
  Z: { name: 'Západ', assoc: 'ZsFZ' },
  S: { name: 'Stred', assoc: 'SsFZ' },
  V: { name: 'Východ', assoc: 'VsFZ' },
};

const LEVEL_INFO = {
  0: { name: 'Zahraničie', base: 72, budget: 30000000, income: 400000, prize: 0 },
  1: { name: 'Niké liga', base: 64, budget: 1500000, income: 60000, prize: 1500000 },
  2: { name: '2. liga', base: 54, budget: 250000, income: 9000, prize: 200000 },
  3: { name: '3. liga', base: 48, budget: 90000, income: 3000, prize: 60000 },
  4: { name: '4. liga', base: 43, budget: 45000, income: 1500, prize: 30000 },
  5: { name: '5. liga', base: 38, budget: 25000, income: 900, prize: 16000 },
  6: { name: '6. liga', base: 34, budget: 14000, income: 550, prize: 9000 },
  7: { name: '7. liga', base: 30, budget: 9000, income: 350, prize: 6000 },
  8: { name: '8. liga', base: 26, budget: 6000, income: 250, prize: 4000 },
  9: { name: '9. liga', base: 22, budget: 4000, income: 160, prize: 2500 },
};

// 3. liga 2026/27 – reálne kluby (súpisky sa generujú)
// [názov, skratka, mesto, rodičovský klub (B-tím)]
const L3_CLUBS = {
  Z: [
    ['AS Trenčín B', 'ASB', 'Trenčín', 'trencin'], ['TJ Spartak Myjava', 'MYJ', 'Myjava'], ['FC Baník Prievidza', 'PRI', 'Prievidza'],
    ['FKM Nové Zámky', 'FNZ', 'Nové Zámky'], ['OK Častkovce', 'CAS', 'Častkovce'], ['ŠK 1923 Gabčíkovo', 'GAB', 'Gabčíkovo'],
    ['MŠK Senec', 'SEN', 'Senec'], ['FK Beluša', 'BEL', 'Beluša'], ['FC DAC 1904 B', 'DAB', 'Dunajská Streda', 'dac'],
    ['TJ Družstevník Veľké Ludince', 'VLU', 'Veľké Ludince'], ['FK Slovan Duslo Šaľa', 'SAL', 'Šaľa'], ['FK Rača', 'RAC', 'Bratislava'],
    ['KFC Komárno B', 'KOB', 'Komárno', 'komarno'], ['FC Nitra', 'NIT', 'Nitra'], ['FC Lužianky', 'LUZ', 'Lužianky'], ['MŠK Púchov', 'PUC', 'Púchov'],
  ],
  S: [
    ['MŠK Námestovo', 'NAM', 'Námestovo'], ['MFK Dukla Banská Bystrica B', 'DUB', 'Banská Bystrica', 'dukla'], ['FTC Fiľakovo', 'FIL', 'Fiľakovo'],
    ['FK Podkonice', 'PDK', 'Podkonice'], ['MŠK Rimavská Sobota', 'RSO', 'Rimavská Sobota'], ['MFK Ružomberok B', 'RUB', 'Ružomberok', 'ruzomberok'],
    ['MŠK Fomat Martin', 'MAR', 'Martin'], ['TJ Tatran Oravské Veselé', 'ORV', 'Oravské Veselé'], ['TJ Baník Kalinovo', 'KAL', 'Kalinovo'],
    ['MŠK Kysucké Nové Mesto', 'KNM', 'Kysucké Nové Mesto'], ['MFK Dolný Kubín', 'DKU', 'Dolný Kubín'], ['TJ Jednota Bánová', 'BAN', 'Žilina'],
    ['MŠK Novohrad Lučenec', 'LUC', 'Lučenec'], ['FK Čadca', 'CAD', 'Čadca'],
  ],
  V: [
    ['FK Spišská Nová Ves', 'SNV', 'Spišská Nová Ves'], ['MŠK Tesla Stropkov', 'STR', 'Stropkov'], ['OFK SIM Raslavice', 'RAS', 'Raslavice'],
    ['ŠK Odeva Lipany', 'LIP', 'Lipany'], ['MFK Spartak Medzev', 'MED', 'Medzev'], ['MFK Snina', 'SNI', 'Snina'],
    ['FC Košice B', 'KSB', 'Košice', 'kosice'], ['1. MFK Kežmarok', 'KEZ', 'Kežmarok'], ['MFK Vranov nad Topľou', 'VRA', 'Vranov nad Topľou'],
    ['FK Poprad', 'POP', 'Poprad'], ['MFK Slovan Sabinov', 'SAB', 'Sabinov'], ['FC Lokomotíva Košice', 'LOK', 'Košice'],
    ['MŠK Spišské Podhradie', 'SPP', 'Spišské Podhradie'], ['Partizán Bardejov BŠK', 'BAR', 'Bardejov'],
  ],
};

// Reálne kluby, ktoré v hre začínajú v 4. lige (zostúpili z 3. ligy)
const L4_EXTRA = {
  Z: [['FC Žolík Malacky', 'MLK', 'Malacky'], ['FC Petržalka B', 'PEB', 'Bratislava', 'petrzalka']],
  S: [],
  V: [],
};

// Obce a mestá pre kluby 4. – 9. ligy. Hviezdička = mesto (klub dostane mestský prefix).
const TOWNS = {
  Z: ('*Stupava,Malinovo,Bernolákovo,Ivanka pri Dunaji,Most pri Bratislave,Svätý Jur,*Pezinok,*Modra,Šenkvice,Vinosady,Budmerice,Častá,' +
    'Zohor,Lozorno,Jablonové,Gajary,Veľké Leváre,Kostolište,Rohožník,Kráľová pri Senci,Hrubý Šúr,Tomášov,Dunajská Lužná,Rovinka,' +
    'Hamuliakovo,*Hlohovec,Leopoldov,*Sereď,Veľké Úľany,Jelka,Sládkovičovo,Cífer,Zavar,Boleráz,Smolenice,Dolná Krupá,Brestovany,' +
    'Trstín,*Piešťany,Vrbové,Veľké Kostoľany,*Holíč,Gbely,*Senica,Šaštín-Stráže,Kúty,Sobotište,Kopčany,*Veľký Meder,Okoč,Kvetoslavov,' +
    'Orechová Potôň,Vrakúň,Topoľníky,Horná Potôň,Lehnice,*Vráble,*Šurany,*Levice,Tlmače,Kalná nad Hronom,Želiezovce,*Štúrovo,*Kolárovo,' +
    '*Hurbanovo,Nesvady,Zemné,Palárikovo,Tvrdošovce,Dvory nad Žitavou,*Topoľčany,*Bánovce nad Bebravou,*Partizánske,Veľké Bielice,' +
    'Chynorany,Jacovce,Mojmírovce,Ivanka pri Nitre,Nitrianske Hrnčiarovce,Golianovo,Výčapy-Opatovce,Nová Dubnica,*Dubnica nad Váhom,' +
    'Ilava,Nemšová,Trenčianske Teplice,Trenčianska Turná,Soblahov,Drietoma,*Nové Mesto nad Váhom,Stará Turá,Bošáca,Brezová pod Bradlom,' +
    '*Handlová,Nováky,Bojnice,Oslany,*Šahy,Vinodol,Branč').split(','),
  S: ('Rajec,Rajecké Teplice,Varín,Teplička nad Váhom,Strečno,Terchová,Belá,Lietavská Lúčka,Divina,Turzovka,Krásno nad Kysucou,Oščadnica,' +
    'Raková,Stará Bystrica,Rudina,Nesluša,Turčianske Teplice,*Vrútky,Sučany,Sklabiňa,Kláštor pod Znievom,*Liptovský Hrádok,Liptovská Teplá,' +
    'Liptovský Ján,Východná,Liptovská Lúžna,Lisková,Likavka,*Tvrdošín,*Trstená,Nižná,Zákamenné,Lokca,Rabča,Babín,*Brezno,Valaská,Badín,' +
    'Sliač,Hriňová,*Detva,*Krupina,*Banská Štiavnica,Žarnovica,*Nová Baňa,Kremnica,Ladomerská Vieska,*Revúca,Hnúšťa,Tisovec,Poltár,' +
    'Jesenské,Tornaľa,*Veľký Krtíš,Modrý Kameň,Vinica,Čierny Balog,Hronec,Ľubietová,Slovenská Ľupča,Selce,Lučatín,Dolná Strehová,' +
    'Kováčová,Očová,Vígľaš,Zvolenská Slatina,Lieskovec,Dobrá Niva,Pliešovce,Heľpa,Pohorelá,Šumiac,Telgárt,Beňuš,Medzibrod,Priechod,' +
    'Hiadeľ,Bušince,Ružiná,Divín,Málinec,Hrnčiarske Zalužany,Rimavské Janovce,Hajnáčka,Klenovec,Jelšava,Muráň,Lubeník,Mošovce,' +
    'Žabokreky,Bobrov,Novoť,Oravská Polhora,Habovka').split(','),
  V: ('Svit,*Vysoké Tatry,Spišská Belá,*Stará Ľubovňa,Podolínec,Veľký Šariš,Ľubotice,Kendice,Petrovany,Široké,Chminianska Nová Ves,' +
    '*Svidník,Giraltovce,*Medzilaborce,Hanušovce nad Topľou,Kurima,Zborov,Malcov,Ľubica,Huncovce,Vrbov,Spišská Stará Ves,Hniezdne,' +
    'Plavnica,Lemešany,Hermanovce,Ražňany,Jarovnice,Šarišské Michaľany,Kapušany,Fintice,Ďačov,*Moldava nad Bodvou,Čaňa,Valaliky,' +
    'Veľká Ida,Družstevná pri Hornáde,Kechnec,Haniska,*Trebišov,Sečovce,Kráľovský Chlmec,Veľké Kapušany,Strážske,*Sobrance,' +
    'Pavlovce nad Uhom,*Rožňava,Dobšiná,*Gelnica,*Krompachy,Spišské Vlachy,Margecany,Smižany,Markušovce,Prakovce,Žakarovce,Jasov,' +
    'Sokoľany,Bidovce,Ruskov,Slanec,Michaľany,Borša,Čierna nad Tisou,Kostoľany nad Hornádom,Košická Polianka,Bracovce,Pozdišovce,' +
    'Vinné,Zalužice,Lastomír,Nižný Hrabovec,Sačurov,Bystré,Soľ,Hencovce,Čemerné,Sedliská,Kladzany,Nacina Ves,Lesné,Oreské,Budkovce,' +
    'Iňačovce,Tibava,Kolbasov,Ulič,Stakčín,Belá nad Cirochou,Kamenica nad Cirochou,Udavské,Ptičie,Brekov,Jasenov,Hažín nad Cirochou').split(','),
};

const CLUB_PREFIX_VILLAGE = ['TJ', 'OFK', 'FK', 'ŠK', 'OŠK', 'TJ Družstevník', 'TJ Slovan', 'TJ Tatran', 'TJ Sokol', 'FK Slavoj',
  'TJ Jednota', 'TJ Iskra', 'FK Spartak', 'TJ Partizán', 'TJ Lokomotíva', 'OFK Baník', 'TJ Slávia', 'TJ Družstevník', 'OFK', 'TJ'];
const CLUB_PREFIX_TOWN = ['MFK', 'MŠK', 'FK', 'FC', 'ŠK', 'MFK Slovan', 'FK Spartak', 'MFK Tatran'];

// Pyramída: počet skupín na úroveň a veľkosť skupiny
const PYRAMID = [
  { lvl: 1, groups: [null] },
  { lvl: 2, groups: [null] },
  { lvl: 3, groups: ['Z', 'S', 'V'] },
  { lvl: 4, groups: ['Z', 'S', 'V'], size: 14 },
  { lvl: 5, groups: ['Z', 'S', 'V'], size: 14 },
  { lvl: 6, groups: ['Z', 'S', 'V'], size: 14 },
  { lvl: 7, groups: ['Z', 'S', 'V'], size: 14 },
  { lvl: 8, groups: ['Z', 'S', 'V'], size: 14 },
  { lvl: 9, groups: ['Z', 'S', 'V'], size: 14 },
];

const FIRST_NAMES = ('Adam,Adrián,Alex,Andrej,Anton,Boris,Branislav,Daniel,Dávid,Denis,Dominik,Dušan,Erik,Filip,František,Gabriel,' +
  'Igor,Ivan,Jakub,Ján,Jaroslav,Jozef,Juraj,Kamil,Karol,Kristián,Ladislav,Lukáš,Ľubomír,Ľuboš,Marek,Marcel,Mário,Marián,Martin,' +
  'Matej,Matúš,Michal,Milan,Miroslav,Norbert,Oliver,Ondrej,Patrik,Pavol,Peter,Radoslav,Rastislav,Richard,Róbert,Roman,Samuel,' +
  'Sebastián,Šimon,Stanislav,Štefan,Tadeáš,Tibor,Timotej,Tomáš,Viktor,Vladimír,Vladislav,Zdenko,René,Benjamín,Jonáš,Nikolas,Damián,' +
  'Leo,Michal,Martin,Tomáš,Lukáš,Peter,Jakub,Samuel,Adam,Marek,Filip,Matej,Dominik,Patrik,Juraj,Jozef,Erik,Richard').split(',');
const FIRST_NAMES_HU = 'Attila,Zoltán,Gábor,László,Csaba,Tamás,Krisztián,Bence,Dániel,Ádám,Roland,Norbert,Péter,Balázs'.split(',');
const SURNAMES = ('Novák,Kováč,Horváth,Varga,Tóth,Nagy,Baláž,Szabó,Molnár,Lukáč,Kováčik,Polák,Hudák,Kollár,Németh,Oravec,Šimko,' +
  'Kuruc,Gajdoš,Krajčovič,Bartoš,Blaho,Benko,Bielik,Čech,Ďurica,Dvorský,Fabian,Gašpar,Hlaváč,Holub,Hrušovský,Hudec,Jakubec,Janík,' +
  'Jurčo,Kačmár,Kapusta,Klimek,Kocúr,Kostka,Krajčí,Kráľ,Kubica,Kučera,Lacko,Majer,Marko,Michalík,Mikuš,Mináč,Mojžiš,Ondrejka,' +
  'Pavlík,Petrík,Pivarník,Radič,Repka,Rusnák,Sedlák,Slovák,Sokol,Staňo,Straka,Šebo,Šoltés,Švec,Tomko,Urban,Vlček,Vrabec,Zajac,' +
  'Žák,Zelenák,Čierny,Biely,Mráz,Kmeť,Halás,Ďurček,Bačo,Pecha,Ďuriš,Kmetko,Belan,Beňo,Bobula,Bulla,Čarnoký,Daňo,Dzurilla,Fedor,' +
  'Gábor,Galko,Gregor,Hanko,Haško,Hornák,Hric,Hrnčiar,Ivanko,Jánoš,Jankovič,Juhás,Kaliňák,Kazimír,Kelemen,Kiš,Klein,Kohút,Koleno,' +
  'Kopecký,Korec,Kosec,Košťál,Kotlár,Kozák,Krupa,Kubík,Kunák,Labaj,Lehocký,Lipták,Lisý,Macko,Maďar,Malý,Martinček,Matis,Medveď,' +
  'Melich,Mihálik,Mikula,Mlynár,Moravčík,Murín,Nemec,Ondruš,Palko,Pálka,Pastorek,Pekár,Petro,Pilát,Píš,Plešivec,Popovič,Puškár,' +
  'Rác,Rajnoha,Repa,Rybár,Sabo,Šedivý,Šimon,Sivák,Skokan,Slaninka,Slezák,Šmida,Sokolík,Solár,Stanko,Šťastný,Sučák,Šuster,Tichý,' +
  'Tkáč,Turan,Uhrin,Vaculík,Valach,Vančo,Vaško,Vavrinec,Veselý,Višňovský,Vojtek,Vrábel,Záhorský,Zemko,Zubák,Žiak,Ťapák,Hlinka,' +
  'Ferko,Jelínek,Mazúr,Bendík,Balog,Rehák,Kolár,Minárik,Šulc,Fiala,Dobrovodský,Hajdúch,Krištof,Jurík,Kubala,Lauko').split(',');
const SURNAMES_HU = 'Kiss,Nagy,Szabó,Horváth,Tóth,Varga,Molnár,Németh,Farkas,Balogh,Papp,Lakatos,Takács,Juhász,Fekete,Szalai,Bíró,Csóka,Bódis'.split(',');

// Farby dresov pre generované kluby
const KIT_COLORS = ['#c8102e', '#1d4fa3', '#1f8a3b', '#ffd200', '#ffffff', '#111111', '#f47b20', '#5bb6ec', '#6a1b9a', '#8b0000',
  '#0d47a1', '#2e7d32', '#ff5722', '#9e9e9e', '#00897b', '#795548', '#e91e63', '#003366'];
const KIT_PATTERNS = ['plain', 'plain', 'plain', 'stripes', 'hoops', 'sleeves', 'sash', 'half'];

// Formácie: [pozícia, hĺbka 0 (vlastná bránka) – 1 (súper), šírka 0 (ľavá strana) – 1 (pravá strana)]
const FORMATIONS = {
  '4-4-2': [['GK', .04, .5], ['DF', .22, .12], ['DF', .19, .37], ['DF', .19, .63], ['DF', .22, .88], ['MF', .46, .12], ['MF', .42, .37], ['MF', .42, .63], ['MF', .46, .88], ['FW', .7, .38], ['FW', .7, .62]],
  '4-3-3': [['GK', .04, .5], ['DF', .22, .12], ['DF', .19, .37], ['DF', .19, .63], ['DF', .22, .88], ['MF', .43, .28], ['MF', .38, .5], ['MF', .43, .72], ['FW', .68, .14], ['FW', .74, .5], ['FW', .68, .86]],
  '4-2-3-1': [['GK', .04, .5], ['DF', .22, .12], ['DF', .19, .37], ['DF', .19, .63], ['DF', .22, .88], ['MF', .36, .38], ['MF', .36, .62], ['MF', .55, .14], ['MF', .56, .5], ['MF', .55, .86], ['FW', .75, .5]],
  '4-1-4-1': [['GK', .04, .5], ['DF', .22, .12], ['DF', .19, .37], ['DF', .19, .63], ['DF', .22, .88], ['MF', .33, .5], ['MF', .5, .12], ['MF', .47, .37], ['MF', .47, .63], ['MF', .5, .88], ['FW', .73, .5]],
  '4-5-1': [['GK', .04, .5], ['DF', .22, .12], ['DF', .19, .37], ['DF', .19, .63], ['DF', .22, .88], ['MF', .46, .1], ['MF', .42, .32], ['MF', .38, .5], ['MF', .42, .68], ['MF', .46, .9], ['FW', .72, .5]],
  '3-5-2': [['GK', .04, .5], ['DF', .2, .25], ['DF', .18, .5], ['DF', .2, .75], ['MF', .46, .08], ['MF', .41, .32], ['MF', .36, .5], ['MF', .41, .68], ['MF', .46, .92], ['FW', .7, .38], ['FW', .7, .62]],
  '3-4-3': [['GK', .04, .5], ['DF', .2, .25], ['DF', .18, .5], ['DF', .2, .75], ['MF', .44, .14], ['MF', .4, .38], ['MF', .4, .62], ['MF', .44, .86], ['FW', .68, .18], ['FW', .73, .5], ['FW', .68, .82]],
  '5-3-2': [['GK', .04, .5], ['DF', .25, .07], ['DF', .2, .3], ['DF', .18, .5], ['DF', .2, .7], ['DF', .25, .93], ['MF', .42, .28], ['MF', .39, .5], ['MF', .42, .72], ['FW', .68, .38], ['FW', .68, .62]],
  '5-4-1': [['GK', .04, .5], ['DF', .25, .07], ['DF', .2, .3], ['DF', .18, .5], ['DF', .2, .7], ['DF', .25, .93], ['MF', .44, .15], ['MF', .41, .38], ['MF', .41, .62], ['MF', .44, .85], ['FW', .7, .5]],
};

const POS_SK = { GK: 'B', DF: 'O', MF: 'Z', FW: 'Ú' };
const POS_NAME_SK = { GK: 'Brankár', DF: 'Obranca', MF: 'Záložník', FW: 'Útočník' };

// Fiktívne reklamné panely okolo ihriska
const AD_BOARDS = [['SLOVAK CHAMPS', '#ffd200', '#14193d'], ['BRYNDZOVÉ HALUŠKY', '#ffffff', '#1f8a3b'], ['KOLIBA GRILL', '#ffffff', '#c8102e'],
  ['DUNAJ ENERGY', '#14193d', '#5bb6ec'], ['TATRY TOUR', '#ffffff', '#0d47a1'], ['DOMÁCA KLOBÁSA', '#ffd200', '#8b0000'],
  ['OŠTIEPOK PLUS', '#111111', '#ffd200'], ['ŽINČICA BAR', '#ffffff', '#00897b'], ['FUTBAL JE ŽIVOT', '#ffffff', '#111111']];
