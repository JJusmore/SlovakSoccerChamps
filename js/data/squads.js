'use strict';
// Reálne kluby a súpisky Niké ligy a 2. ligy (sezóna 2026/27).
// Zdroj súpisiek: Wikipédia (stav august – september 2026). Hodnotenia (OVR) a vek sú herné odhady.
// Formát riadku: POZ Meno Priezvisko NÁR OVR VEK
// kit: [dres, doplnková farba, trenírky, vzor]  vzor: plain | stripes | hoops | sash | half | sleeves

const REAL_CLUBS = [
  // ───────────────────────────── NIKÉ LIGA ─────────────────────────────
  { key: 'slovan', lvl: 1, name: 'ŠK Slovan Bratislava', short: 'SLO', city: 'Bratislava', reg: 'Z', stadium: 'Tehelné pole',
    kit: ['#5bb6ec', '#ffffff', '#ffffff', 'sleeves'], budget: 9000000, squad: `
GK Dominik Takáč SVK 75 27
GK Aleksandar Popović SRB 68 27
GK Matúš Macík SVK 64 33
DF Kevin Wimmer AUT 71 34
DF Kenan Bajrić SLO 73 32
DF Svetozar Marković SRB 71 26
DF Jurij Medveděv CZE 72 30
DF César Blackman PAN 72 28
DF Samuel Kozlovský SVK 64 21
DF Sandro Cruz ANG 70 29
DF Sahmkou Camara GUI 63 19
MF Peter Pokorný SVK 71 25
MF Rahim Ibrahim GHA 73 25
MF Leo Hofstädter SVK 61 19
MF Artur Gajdoš SVK 67 22
MF Tigran Barseghyan ARM 75 33
MF Alen Mustafić BIH 72 24
MF Cristian Martínez PAN 70 29
MF Danylo Ihnatenko UKR 73 27
MF Daiki Matsuoka JPN 69 25
FW Mykola Kukharevych UKR 73 25
FW Nino Marcelli SVK 73 21
FW Roman Čerepkai SVK 66 24
FW Alasana Yirajang GAM 68 23
FW Manasse Kianga ENG 65 20
FW Suleiman Camara GAM 68 25
FW Matúš Tomáško SVK 58 18
FW Alexej Maroš SVK 57 18
FW Adam Griger SVK 67 22
FW Andraž Šporar SLO 77 32` },

  { key: 'dac', lvl: 1, name: 'FC DAC 1904 Dunajská Streda', short: 'DAC', city: 'Dunajská Streda', reg: 'Z', stadium: 'MOL Aréna',
    kit: ['#ffd400', '#1c3f94', '#1c3f94', 'plain'], budget: 5000000, squad: `
GK Filipe BRA 68 27
GK Aljaž Ivačič SLO 70 32
GK Phillip Živanović AUT 63 22
GK Attila Németh SVK 58 20
DF Joseph Pacheco PAN 68 24
DF Simen Juklerød NOR 70 31
DF Tsotne Kapanadze GEO 69 23
DF Žan Trontelj SLO 69 26
DF Filip Blažek SVK 66 23
DF Taras Kacharaba UKR 71 31
DF Bálint Csóka SVK 63 20
DF Rhyan Modesto BRA 66 23
DF Klemen Nemanič SLO 69 28
MF Julien Eymard Bationo CIV 68 23
MF Fallou Diongue SEN 66 22
MF Nathan Udvaros SVK 60 19
MF Martin Jenčuš SVK 60 19
MF Adam Lábo SVK 59 19
MF Samsondin Ouro TOG 70 23
MF Máté Tuboly HUN 67 22
FW Uroš Kabić SRB 69 22
FW Andreas Gruber AUT 70 26
FW Ammar Ramadan SYR 72 25
FW Abdoulaye Gueye SEN 68 22
FW Pavol Šafranko SVK 70 31
FW Alioune Sylla SEN 67 21
FW Giorgi Gagua GEO 66 22
FW Prince Owusu GHA 70 29
FW Matej Trusa SVK 64 25` },

  { key: 'trnava', lvl: 1, name: 'FC Spartak Trnava', short: 'TRN', city: 'Trnava', reg: 'Z', stadium: 'Štadión Antona Malatinského',
    kit: ['#d0112b', '#111111', '#111111', 'plain'], budget: 4000000, squad: `
GK Martin Vantruba SVK 71 28
GK Martin Janáček CZE 64 30
GK Tomáš Jablonický SVK 58 20
GK Oskar Casagrande SLO 60 20
GK Benjamín Száraz SVK 55 18
DF Patrick Nwadike SWE 67 24
DF Juanmi Carrión ESP 67 27
DF Libor Holík CZE 69 28
DF Marek Ujlaky SVK 66 25
DF Melos Bajrami KOS 67 25
DF Lukáš Fabiš SVK 66 24
DF Kristián Koštrna SVK 67 25
DF Ivan Mensah GHA 66 22
DF Martin Mikovič SVK 69 36
MF Roman Begala SVK 66 26
MF Roman Procházka SVK 70 37
MF Stefan Škrbo AUT 69 25
MF Giorgi Moistsrapishvili GEO 68 24
MF Philip Azango NGR 70 26
MF Dennis Konney GHA 64 21
MF Lorent Mehmeti SWE 65 22
MF Filip Trello SVK 62 20
MF Dávid Bukovský SVK 63 23
MF Luka Khorkheli GEO 63 21
MF Erik Sabo SVK 70 35
MF Marin Laušić CRO 68 26
FW Tijmen Wildeboer NED 68 24
FW Timotej Kudlička SVK 62 19
FW David Polťák SVK 63 21` },

  { key: 'zilina', lvl: 1, name: 'MŠK Žilina', short: 'ZIL', city: 'Žilina', reg: 'S', stadium: 'Štadión pod Dubňom',
    kit: ['#ffd200', '#00843d', '#00843d', 'plain'], budget: 2500000, squad: `
GK Jakub Badžgoň SVK 64 21
GK Tamás Tarcsi SVK 60 21
GK Dávid Šípoš SVK 62 24
DF Marek Okál SVK 62 20
DF Matúš Pavlík SVK 63 21
DF Michal Svoboda SVK 64 21
DF Ján Minárik SVK 66 26
DF Marcus Arnold Traoré CIV 64 21
DF Krisztián Bari SVK 65 22
DF Timotej Hranica SVK 61 19
DF Johan Albin SWE 65 25
DF Aleksandre Narimanidze GEO 66 24
DF Filip Kaša CZE 68 32
MF Xavier Adang CMR 65 22
MF Andrei Florea ROU 66 24
MF Fabian Bzdyl POL 65 22
MF Miroslav Káčer SVK 68 30
MF Róbert Petruška SVK 62 20
FW František Kóša SVK 63 20
FW Patrik Baleja SVK 62 20
FW Patrik Iľko SVK 66 22
FW Michal Faško SVK 67 32
FW Samuel Ďatko SVK 61 19
FW Lukáš Juliš CZE 68 31
FW Dani Homet ESP 65 26
FW Marko Roginić CRO 67 30
FW Kenan Bilalović SWE 66 21` },

  { key: 'kosice', lvl: 1, name: 'FC Košice', short: 'KOS', city: 'Košice', reg: 'V', stadium: 'Košická futbalová aréna',
    kit: ['#1e56b0', '#ffd200', '#ffffff', 'sleeves'], budget: 2000000, squad: `
GK Matúš Kira SVK 64 26
GK Filip Kalanin SVK 60 22
DF Tomáš Ďurko SVK 63 24
DF Daniel Magda SVK 66 28
DF Dominik Kružliak SVK 65 31
DF Sebastian Kóša SVK 63 22
DF Osman Kakay SLE 66 29
DF Taylor Moore ENG 66 29
DF Leonardo Lukačević AUT 63 24
DF Bojan Damjanović MNE 64 25
MF Jakub Marko SVK 63 24
MF Filip Lichý SVK 64 25
MF Milan Dimun SVK 68 30
MF Dávid Gallovič SVK 66 26
MF Edin Julardžija CRO 66 27
MF Matej Jakúbek SVK 62 22
MF Miroslav Sovič SVK 63 23
MF Matej Madleňák SVK 63 22
MF Marek Zsigmund SVK 64 23
MF Juraj Teplan SVK 63 26
MF Maxim Mateáš SVK 60 19
MF Kevor Palumets EST 65 23
MF Viliam Vrabel SVK 59 19
FW Aleksandar Kahvić BIH 67 25
FW Milan Rehuš SVK 66 24
FW Aleksa Maraš MNE 66 25` },

  { key: 'podbrezova', lvl: 1, name: 'FK Železiarne Podbrezová', short: 'ZPO', city: 'Podbrezová', reg: 'S', stadium: 'ZELPO Aréna',
    kit: ['#1b3f8b', '#111111', '#1b3f8b', 'stripes'], budget: 1500000, squad: `
GK Martin Trnovský SVK 64 25
GK Ivan Rehák SVK 60 23
GK Lukáš Domanisky SVK 57 20
DF Rene Lampreht SLO 66 24
DF René Paraj SVK 65 24
DF Saidy Saibo GAM 63 22
DF Ján Krivák SVK 65 30
DF Radek Kejval CZE 64 26
DF Jakub Luka SVK 64 24
MF Samson Tijani NGR 67 23
MF Ondřej Deml CZE 67 29
MF Martin Chrien SVK 68 30
MF Vincent Chyla SVK 64 23
MF Maksym Khyminets UKR 66 27
MF Alexander Amoafo GHA 63 22
MF Šimon Faško SVK 62 22
MF Samuel Štefánik SVK 64 35
MF Matúš Rusnák SVK 63 26
MF Peter Kováčik SVK 64 30
FW Luka Silagadze GEO 66 23
FW Balša Mrvaljević MNE 65 24
FW Karlo Miljanić CRO 66 25
FW Michal Duraj SVK 63 23` },

  { key: 'michalovce', lvl: 1, name: 'MFK Zemplín Michalovce', short: 'MIC', city: 'Michalovce', reg: 'V', stadium: 'Mestský futbalový štadión',
    kit: ['#ffd200', '#0033a0', '#0033a0', 'hoops'], budget: 1200000, squad: `
GK Patrik Lukáč SVK 63 24
GK Adam Jakubech SVK 64 29
GK Matej Dula SVK 56 20
DF Martin Koscelník SVK 63 31
DF Polydefkis Volanakis GRE 62 25
DF Franck Bahi GUI 61 24
DF Lukáš Pauschek SVK 63 33
DF Tornike Dzotsenidze GEO 61 25
DF Matej Čurma SVK 60 23
DF Park Tae-rang KOR 61 24
MF Abdul Zubairu NGR 62 27
MF Kai Brosnan ENG 62 23
MF Tommy Pilling ENG 62 22
MF Kido Taylor-Hart ENG 62 27
MF Konstantinos Oikonomou GRE 61 24
MF Patrik Danek SVK 62 26
MF Nikita Mihhailov EST 62 23
MF Orestis Kalemi GRE 59 20
MF Martin Bednár SVK 59 21
MF Rastislav Korba SVK 58 20
MF Ben Cottrell ENG 61 22
FW Tomasz Walczak POL 62 23
FW José Ángel López MEX 61 24
FW Vasilios Theofanopoulos GRE 61 24
FW Luka Lemishko UKR 61 22
FW Noa Cervantes ALG 60 21
FW Oleg Záhradník SVK 58 20
FW Elvis Mashike COD 61 22` },

  { key: 'trencin', lvl: 1, name: 'AS Trenčín', short: 'AST', city: 'Trenčín', reg: 'Z', stadium: 'Štadión Sihoť',
    kit: ['#ffffff', '#d0112b', '#d0112b', 'sash'], budget: 1500000, squad: `
GK Andrija Katić SRB 64 25
GK Matúš Sláviček SVK 60 23
DF Nikola Jovanović SRB 62 24
DF Issa Traoré MLI 62 22
DF Jonathan Mulder ISR 62 24
DF Kristo Hussar EST 61 22
DF Viktor Šimić CRO 62 24
DF Lukáš Skovajsa SVK 63 32
DF Jaroslav Holp SVK 58 20
DF Loïc Bessilé TOG 63 24
DF Richard Križan SVK 60 22
DF Hugo Pavek SVK 58 19
DF Papa Diouf SEN 61 22
MF Fedor Kasana SVK 60 21
MF Eynel Soares CPV 62 23
MF Tadeáš Hájovský SVK 63 25
MF Clement Ansah GHA 61 21
MF Markus Poom EST 63 27
MF Gia Nadareishvili GEO 61 21
MF Dimitri Jepihhin EST 59 21
MF Jenno Campagne NED 60 21
MF Jakub Paur SVK 63 34
MF Pablo González ESP 61 24
FW Jordan Zirkzee NED 61 21
FW Dylann Kam BFA 62 22
FW Ridwan Sanusi NGR 62 21
FW Lukáš Mikulaj SVK 60 22
FW Mohammed Garba NGR 60 20
FW Franko Sabljić BIH 61 21
FW Mikkel Boye DEN 62 23` },

  { key: 'skalica', lvl: 1, name: 'MFK Skalica', short: 'SKA', city: 'Skalica', reg: 'Z', stadium: 'Mestský štadión Skalica',
    kit: ['#ffffff', '#1f8a3b', '#1f8a3b', 'half'], budget: 900000, squad: `
GK Richard Ludha SVK 63 28
GK Erik Riska SVK 56 21
GK Martin Junas SVK 60 30
DF Martin Černek SVK 61 22
DF Maurizio Macorig GER 62 25
DF Martin Rýzek SVK 62 23
DF Samuel Sula SVK 60 22
DF Oliver Podhorín SVK 59 21
DF Peter Guinari CAF 61 25
MF Patrick Karhan SVK 62 20
MF Lukáš Šimko SVK 62 25
MF Adam Morong SVK 63 27
MF Levan Nonikashvili GEO 62 24
MF Adam Križan SVK 61 24
MF Michal Gulíšek SVK 61 26
MF Petr Pudhorocký CZE 61 22
MF Martin Nagy SVK 60 23
MF Martin Mášik SVK 61 26
MF Adam Ravas SVK 60 21
MF Damian Baris SVK 57 19
MF Abbati Abdullahi NGR 62 22
FW Philip Onyedika NGR 62 22
FW Ephraim Eshele GER 61 24
FW Erik Daniel CZE 63 31
FW Roman Potočný CZE 63 35` },

  { key: 'komarno', lvl: 1, name: 'KFC Komárno', short: 'KOM', city: 'Komárno', reg: 'Z', stadium: 'ViOn Aréna',
    kit: ['#1d4fa3', '#ffffff', '#ffffff', 'stripes'], budget: 1200000, squad: `
GK Filip Dlubac SVK 63 26
GK Erik Gyurákovics HUN 58 21
GK Branislav Pindroch SVK 60 35
DF Martin Šimko SVK 63 28
DF Nikita Vlasenko SUI 63 25
DF Dominik Špiriak SVK 64 32
DF Šimon Šmehýl SVK 63 30
DF Jakub Palán CZE 62 26
DF Matheus Leoni BRA 62 24
DF Róbert Pillár SVK 64 35
DF Adam Krčík SVK 63 28
DF Zsombor Mitring HUN 60 22
MF Dan Ožvolda CZE 62 25
MF Ganbayar Ganbold MGL 63 25
MF Kristóf Domonkos SVK 64 25
MF Dominik Žák CZE 61 23
MF Filip Kiss SVK 65 36
MF Christian Bayemi CMR 62 24
MF Ján Bernát SVK 64 25
MF Andriy Gavrylenko UKR 61 24
MF Andy Masaryk SVK 61 23
MF István Vojtko HUN 60 23
FW Jakub Sylvestr SVK 63 37
FW Yunusa Muritala NGR 64 24
FW Nándor Tamás ROU 62 23
FW Okiki Akinwande NGR 62 23
FW Lukáš Leginus SVK 60 22` },

  { key: 'ruzomberok', lvl: 1, name: 'MFK Ružomberok', short: 'RUZ', city: 'Ružomberok', reg: 'S', stadium: 'Štadión pod Čebraťom',
    kit: ['#f47b20', '#111111', '#111111', 'plain'], budget: 1000000, squad: `
GK Ivan Krajčírik SVK 65 22
GK Boris Halada SVK 58 21
GK Dávid Húska SVK 56 20
GK Attila Horváth SVK 55 19
DF Alexander Mojžiš SVK 62 27
DF Tomáš Marušin SVK 61 23
DF Adrián Slávik SVK 62 27
DF Daniel Köstl CZE 63 28
DF Daniel Prekop SVK 61 24
DF Alexander Selecký SVK 62 25
MF Peter Doroš SVK 60 21
MF Oliver Luterán SVK 64 30
MF Ján Murgaš SVK 63 23
MF Filip Souček CZE 64 26
MF Samuel Lavrinčík SVK 62 22
MF Martin Bačík SVK 59 21
MF Adam Tučný SVK 62 25
MF Marián Chobot SVK 63 26
MF Tomáš Buchvaldek CZE 62 23
MF Dario Grgić SRB 61 21
MF Štefan Gerec SVK 62 33
MF Dominik Kostka CZE 61 22
FW Matěj Koubek CZE 64 26
FW David Jackuliak SVK 59 21
FW Jan Hladík CZE 62 25
FW Vojtěch Hranoš CZE 61 23
FW Marko Kelemen SVK 61 26
FW Martin Boďa SVK 64 32` },

  { key: 'dukla', lvl: 1, name: 'MFK Dukla Banská Bystrica', short: 'DUK', city: 'Banská Bystrica', reg: 'S', stadium: 'Národný atletický štadión',
    kit: ['#c8102e', '#ffffff', '#ffffff', 'sleeves'], budget: 900000, squad: `
GK Jakub Trefil CZE 62 27
GK Lukáš Hroššo SVK 62 37
GK Michal Trnovský SVK 56 20
GK Michal Lukáč SVK 55 22
DF Alabi Adewale NGR 61 24
DF Adam Baláž SVK 60 22
DF Nicolas Šikula SVK 61 24
DF João Miranda BRA 62 26
DF Mikuláš Bakaľa SVK 60 22
DF Ľubomír Willwéber SVK 61 23
DF Maik BRA 62 25
DF Kazeem Bolaji NGR 62 24
MF Dávid Richtárech SVK 62 26
MF Jakub Považanec SVK 64 34
MF Tibor Slebodník SVK 62 27
MF Kristián Vallo SVK 63 27
MF Adrian Sivicek SVK 58 20
MF Branko Pinďura SVK 57 19
MF Dominik Veselovský SVK 60 22
MF Viktor Tóth SVK 58 20
MF Martin Gjorgievski MKD 63 26
FW Regő Szánthó HUN 63 24
FW Róbert Polievka SVK 64 30
FW Praisegod Okechukwu NGR 61 22
FW Nikolas Kubala SVK 58 20
FW Enzo Arevalo ESP 61 24
FW Michal Ďuriš SVK 64 38
FW Adam Hanes SVK 58 21
FW Christopher Argueta ESA 61 24` },

  // ───────────────────────────── 2. LIGA ─────────────────────────────
  { key: 'presov', lvl: 2, name: '1. FC Tatran Prešov', short: 'TAT', city: 'Prešov', reg: 'V', stadium: 'Futbalový štadión Tatran',
    kit: ['#0f8a3c', '#ffffff', '#ffffff', 'stripes'], budget: 600000, squad: `
GK Adrián Knurovský SVK 58 30
GK Adam Štapinský SVK 52 20
GK Maksym Kuchynskyi UKR 55 28
DF Michal Sipľak SVK 58 29
DF Patrik Šimko SVK 57 34
DF Martin Gomola SVK 56 25
DF Marek Terpák SVK 55 24
DF Richard Župa SVK 56 25
DF Jakub Tecl CZE 56 24
DF Jozef Menich SVK 57 30
MF Ricardo Gonçalves POL 59 25
MF Artur Ukhan UKR 57 24
MF Radim Pobořil CZE 57 25
MF Šimon Sabolčík SVK 55 22
MF Jakub Molnár SVK 54 22
MF Mário Hollý SVK 53 20
MF Daniel Suchý CZE 56 26
FW Martin Regáli SVK 59 33
FW Stanislav Olejník SVK 57 31
FW Ruslan Leuta UKR 56 23
FW René Repaský SVK 54 21
FW Matej Franko SVK 55 22
FW Dávid Griger SVK 56 25
FW Landing Sagna SEN 57 23` },

  { key: 'zlatemoravce', lvl: 2, name: 'FC ViOn Zlaté Moravce', short: 'VIO', city: 'Zlaté Moravce', reg: 'Z', stadium: 'ViOn Aréna Zlaté Moravce',
    kit: ['#ffffff', '#1c4aa0', '#1c4aa0', 'sleeves'], budget: 450000, squad: `
GK Matyáš Trešl CZE 56 23
GK Patrik Vasiľ SVK 53 21
DF Šimon Mičuda SVK 55 22
DF Roland Buhaj SVK 55 23
DF Andrej Redenkovič SVK 56 26
DF Daniel Kutík CZE 55 24
DF Martin Konopka SVK 56 30
DF Samuel Bagín SVK 54 22
DF Youssou Diop SEN 56 24
DF Matej Majerčík SVK 53 20
MF Oskar Lachowicz POL 56 24
MF Dávid Bugár SVK 55 23
MF Denis Duga SVK 57 32
MF Saihou Sonko GAM 55 22
MF Ali Ousaye GAM 55 22
MF Martin Bukata SVK 58 32
MF Leonardo Bortoli SVK 53 20
MF Maximilián Halo SVK 53 20
MF Sebastian Maťo SVK 52 19
FW Adam Pudil CZE 57 25
FW Samuel Kuchárik SVK 55 22` },

  { key: 'petrzalka', lvl: 2, name: 'FC Petržalka', short: 'PET', city: 'Bratislava', reg: 'Z', stadium: 'Štadión Petržalka',
    kit: ['#ffffff', '#111111', '#111111', 'stripes'], budget: 450000, squad: `
GK Michal Hudec SVK 57 27
GK Andrej Mikoláš SVK 52 20
DF Nikita Kelembet UKR 56 24
DF Nikolaos Deligiannis GRE 56 25
DF Nicolas Sagan SVK 54 21
DF Alex Barilla SVK 54 22
DF Branislav Niňaj SVK 59 31
DF Miha Kompan Breznik SLO 56 28
DF Matúš Capko SVK 53 21
DF Tomáš Jasso SVK 53 21
MF Samuel Alabi GHA 56 22
MF Martin Hlavatý SVK 55 23
MF Dávid Bordáč SVK 55 23
MF Peter Mazan SVK 58 35
MF Collins Boah GHA 55 22
MF Peter Nikolaj SVK 53 21
MF Viktor Sliacky SVK 53 20
MF Lukáš Gašparovič SVK 56 27
MF Samuel Šefčík SVK 54 23
MF Derrick Bonsu GHA 55 22
MF Jakub Kousal CZE 55 24
MF Samuel Habodasz SVK 52 20
FW Oliver Kubka SVK 55 21
FW Markus Sevce SVK 53 20
FW Adam Goljan SVK 56 23
FW Elvis Isaac NGR 57 27` },

  { key: 'mikulas', lvl: 2, name: 'MFK Tatran Liptovský Mikuláš', short: 'TLM', city: 'Liptovský Mikuláš', reg: 'S', stadium: 'Štadión Liptovský Mikuláš',
    kit: ['#ffffff', '#c8102e', '#c8102e', 'hoops'], budget: 350000, squad: `
GK Adrián Slančík SVK 55 27
DF Michal Piter-Bučko SVK 56 33
DF Martin Sot CZE 54 24
MF Adrián Macejko SVK 55 24
MF Tomáš Gerát SVK 55 25
MF Tomáš Staš SVK 54 26
MF Samuel Gladiš SVK 54 22
MF Ľuboslav Laura SVK 55 25
MF Lukáš Jendrek SVK 53 22
MF Rafael Freitas BRA 55 24
FW Richard Bartoš SVK 57 34
FW Šimon Mojčák SVK 52 20
FW Emmanuel Okonji NGR 55 23
FW Abdulhakim Daneji NGR 55 23
FW Samuel Chlepko SVK 52 20` },

  { key: 'pohronie', lvl: 2, name: 'FK Pohronie', short: 'POH', city: 'Žiar nad Hronom', reg: 'S', stadium: 'Mestský štadión Žiar nad Hronom',
    kit: ['#1565c0', '#ffd200', '#1565c0', 'plain'], budget: 350000, squad: `
GK Igor Šemrinec SVK 56 27
GK Peter Sukovský SVK 53 25
GK Pedro Rodriguez CZE 52 20
DF Pavol Kutka SVK 54 25
DF Sanna Jobe GAM 54 22
DF Jakub Port CZE 54 24
DF Bernard Mendy GAM 53 22
DF Mohammad Sarr GAM 53 22
DF Alex Lajčiak SVK 52 21
MF Aleksandr Lohmatov EST 56 25
MF Mohammed Sallah GAM 54 22
MF Jozef Špyrka SVK 56 31
MF Šimon Ivan SVK 53 22
MF Fares Shudeiwa SVK 53 21
MF Patrik Hrnčiar SVK 52 22
MF Muhammed Dumbuya GAM 53 22
MF Samuel Šubert SVK 52 21
MF Adrián Petic SVK 52 21
FW Boris Rusnák SVK 53 22
FW Alin Lerint SVK 54 22
FW Mário Mrva SVK 52 21
FW Marek Kuzma SVK 55 28
FW Adrián Lutka SVK 51 20` },

  { key: 'inter', lvl: 2, name: 'FK Inter Bratislava', short: 'INT', city: 'Bratislava', reg: 'Z', stadium: 'Štadión Pasienky',
    kit: ['#ffd200', '#111111', '#111111', 'stripes'], budget: 400000, squad: `
GK Peter Sokol SVK 56 28
GK Michal Šulla SVK 54 32
GK Marek Hamrák SVK 52 22
DF Kristián Mihálek SVK 54 22
DF Adam Lami SVK 54 23
DF Atiki Timi Egbe NGR 55 23
DF Lukáš Remeň SVK 54 24
DF Alexander Tóth SVK 54 24
DF Marek Václav SVK 54 26
DF Richard Nagy SVK 53 22
DF Daniel Žiška SVK 53 22
MF Dávid Straka SVK 55 24
MF Samuel Svetlík SVK 54 23
MF Óscar Castellano ESP 56 26
MF Ronald Kubovič SVK 53 22
MF Tomáš Balko SVK 53 22
MF Martin Kušnír SVK 54 24
MF Juraj Piroska SVK 55 30
MF Marek Sokol SVK 52 21
MF Ivan Betík SVK 52 22
MF Luis Carrero VEN 55 24
FW Denis Franke CZE 55 24
FW Tomáš Vantruba SVK 55 25
FW Boris Polevka SVK 53 21
FW Bernard Ababio GHA 55 22
FW Adebayo Isa Yusuf NGR 55 23
FW Pavol Bellás SVK 55 26
FW Viktor Tatár SVK 53 22` },

  { key: 'humenne', lvl: 2, name: 'FK Humenné', short: 'HUM', city: 'Humenné', reg: 'V', stadium: 'Štadión Humenné',
    kit: ['#ffd200', '#1c3f94', '#1c3f94', 'sleeves'], budget: 250000, squad: `
GK Miloslav Bréda SVK 54 28
DF Igor Komjatý SVK 53 24
DF Jakub Straka SVK 52 22
DF Simeon Kohút SVK 52 22
DF Nikolas Bajus SVK 52 21
DF Ľubomír Žinčák SVK 52 20
DF Patrik Lazár SVK 52 22
MF Cyril Vasiľ SVK 53 24
MF František Sitarčík SVK 53 23
MF Marek Zlacký SVK 53 23
MF Viktor Maťaš SVK 55 30
MF Mateus Oliveira BRA 54 24
MF Rastislav Skalka SVK 52 22
MF Dominik Veselý SVK 52 21
MF Lukáš Laurov SVK 52 21
FW Matúš Bega SVK 53 25
FW Oleh Vyshnevskyi UKR 54 24
FW Zoran Záhradník SVK 52 21` },

  { key: 'zvolen', lvl: 2, name: 'MFK Zvolen', short: 'ZVO', city: 'Zvolen', reg: 'S', stadium: 'Štadión MFK Zvolen',
    kit: ['#0d47a1', '#ffffff', '#ffffff', 'plain'], budget: 250000, squad: `
GK Milan Mráz SVK 54 26
GK Branko Maruniak SVK 52 22
GK Šimon Kocka SVK 51 20
DF Lukáš Filipiak SVK 53 24
DF Erik Gaško SVK 53 23
DF Abubakar Bello NGR 54 23
DF Adam Oravec SVK 53 24
DF Lukáš Dvorský SVK 53 24
DF Stephen Adayilo NGR 53 22
DF Matthias Leitl SVK 52 21
DF Bernard Petrák SVK 53 25
DF Timotej Záhumenský SVK 52 20
MF Ján Nemčok SVK 53 24
MF Miroslav Gono SVK 55 30
MF Tomáš Kajsin SVK 53 23
MF Kristi Qose ALB 55 27
MF Matúš Körös SVK 52 21
MF Lukáš Biely SVK 52 22
FW Peter Onuoha NGR 55 23
FW Kelechi Izuakor NGR 55 24
FW Lazar Vrekić SVK 52 21` },

  { key: 'malzenice', lvl: 2, name: 'OFK Dynamo Malženice', short: 'MAL', city: 'Malženice', reg: 'Z', stadium: 'Štadión Malženice',
    kit: ['#1f8a3b', '#ffffff', '#ffffff', 'plain'], budget: 300000, squad: `
GK Martin Chudý SVK 55 37
GK Matyáš Šilhavý CZE 52 20
DF Oleksandr Ushchenko UKR 54 25
DF Nicolás Gorosito ARG 55 27
DF Martin Turanský SVK 53 23
DF Nicolas Kurej SVK 52 21
DF Jakub Krajčovič SVK 53 23
DF Michal Boledovič SVK 52 22
MF Tomáš Šarmír SVK 53 24
MF Arthur Legnani BRA 55 25
MF Adrián Mojžiš SVK 53 23
MF Thiago Gaúcho BRA 55 25
MF Alexander Horvát SVK 52 22
MF Mário Henyig SVK 52 22
MF João Gabriel BRA 54 23
MF Samuel Ptačin SVK 51 20
MF Jakub Ležák SVK 51 20
MF Michal Farkaš SVK 52 22
FW Marek Fábry SVK 55 31
FW Patrik Priecel SVK 52 21
FW Juraj Duchovič SVK 51 20
FW Boris Druga SVK 52 21` },

  { key: 'galanta', lvl: 2, name: 'FC Slovan Galanta', short: 'GAL', city: 'Galanta', reg: 'Z', stadium: 'Mestský štadión Galanta',
    kit: ['#1d4fa3', '#d0112b', '#ffffff', 'sleeves'], budget: 250000, squad: `
GK Maxim Adam Amrich SVK 54 22
GK Kristián Húska SVK 52 21
GK Dominik Hollósy SVK 51 20
DF Denis Horník SVK 56 30
DF Michal Cehula SVK 54 26
DF Tomáš Kiss SVK 54 25
DF Kristián Mego SVK 53 23
DF Filip Rajt SVK 53 23
DF David Murar SVK 52 22
DF Martin Slaninka SVK 53 24
DF Oliver Patrnčiak SVK 52 21
DF Jozef Balog SVK 53 25
MF Šimon Kováč SVK 54 24
MF Martin Repa SVK 55 27
MF Roman Kollárik SVK 54 26
MF Adam Mihálik SVK 53 22
MF Samuel Benovič SVK 52 21
MF Lukáš Botlo SVK 53 24
FW Martinko Macák SVK 53 20
FW Ronald Kočík SVK 54 24
FW Marcel Bilčík SVK 53 23
FW Dárius Rusko SVK 53 22
FW Tomáš Horák SVK 54 25
FW Miroslav Tomek CZE 55 26
FW Mário Zimáni SVK 53 23
FW Patrik Müllner SVK 52 21
FW Sebastián Kriška SVK 52 21` },

  { key: 'samorin', lvl: 2, name: 'FC ŠTK 1914 Šamorín', short: 'SAM', city: 'Šamorín', reg: 'Z', stadium: 'Štadión ŠTK Šamorín',
    kit: ['#1d4fa3', '#d0112b', '#1d4fa3', 'half'], budget: 300000, squad: `
GK Vasilios Kaltsas GRE 55 25
GK Alex Hudok SVK 52 21
GK Andreas Barninec SVK 51 19
DF Arnaud Konan MLI 54 23
DF Michal Ranko SVK 54 27
DF Draško Marič-Bjekič SVK 53 22
DF Giuliano Antonio Marek SVK 52 20
DF Marcel Kucman SVK 54 26
DF Vladimír Bajtoš SVK 53 24
DF Rachid Barro BFA 54 23
MF Abov Avetisyan ARM 55 25
MF Štefan Varga SVK 53 23
MF Luka Bubuteishvili GEO 55 24
MF Samuel Bednár SVK 52 21
MF Marko Totka SVK 52 21
MF Zoumana Ky CIV 54 23
MF Karol Blaško SVK 55 29
MF Mohamed Diakite CIV 54 22
MF Peter Varga SVK 53 23
FW Daniel Pavúk SVK 54 24
FW Onyebuchi Solomon NGR 55 23
FW Marián Weber SVK 53 22
FW Bálint Kireth SVK 52 20
FW Salif Simpore BFA 54 22
FW Oliver Reiter SVK 52 21
FW Seraphin Useni COD 54 22` },

  { key: 'bytca', lvl: 2, name: 'MFK Bytča', short: 'BYT', city: 'Bytča', reg: 'S', stadium: 'Mestský štadión Bytča',
    kit: ['#ffffff', '#1d4fa3', '#1d4fa3', 'hoops'], budget: 200000, squad: `
GK Adrián Tkáč SVK 53 25
GK Richard Rybár SVK 51 22
GK Tobias Fuka SVK 50 19
DF Lukáš Mravec SVK 52 24
DF Andrej Knapec SVK 52 23
DF Róbert Petrus SVK 52 24
DF Samuel Kaštan SVK 52 22
DF Jakub Hrtánek SVK 51 22
DF Matej Zajac SVK 52 23
DF Vasyl Subotenko UKR 53 24
DF Saleh Haruna NGR 53 23
DF Kiano Falcao ESA 52 22
DF Jozef Chrenko SVK 51 22
MF Gabriel Gaňa SVK 52 23
MF Alex Mičienka SVK 52 22
MF Matej Pavlík SVK 52 23
MF Rastislav Planeta SVK 52 25
MF Tomáš Podmalík SVK 52 24
MF Matúš Filek SVK 51 21
MF Daniel Magát SVK 52 23
FW Daniel Hundák SVK 53 24
FW Matěj Brezina SVK 52 22
FW Luis Felipe BRA 54 24
FW Branislav Minárik SVK 52 25
FW Patrik Jakubík SVK 53 26
FW Cesar Luna COL 53 23
FW Arthur Miroslav Boženík SVK 51 20` },

  { key: 'povazska', lvl: 2, name: 'MŠK Považská Bystrica', short: 'MPB', city: 'Považská Bystrica', reg: 'Z', stadium: 'Štadión MŠK Považská Bystrica',
    kit: ['#c8102e', '#1d4fa3', '#1d4fa3', 'hoops'], budget: 220000, squad: `
GK Marek Teplan SVK 54 26
GK Matúš Bastek SVK 51 20
GK Oliver Minár SVK 50 19
DF Danylo Chaban UKR 54 24
DF Ján Kubala SVK 53 24
DF Dušan Kucharčík SVK 53 25
MF Dawid Kabat POL 54 24
MF Denis Potoma SVK 53 23
MF Filip Firbacher CZE 53 23
MF Anton Sloboda SVK 54 39
MF Samuel Misík SVK 52 21
MF Maroš Čurik SVK 52 22
MF Roman Zemko SVK 52 22
MF Franciszek Liszka POL 53 22
MF Martin Matejčík SVK 52 22
MF Rudolf Božík SVK 53 26
FW Adam Gáborík SVK 54 24
FW Péter Kotroczó HUN 54 24
FW Adrián Celko SVK 52 21
FW Jakub Tančík SVK 52 21` },

  // Kluby 2. ligy bez dostupnej súpisky – hráči sa vygenerujú
  { key: 'lehota', lvl: 2, name: 'FK Baník Lehota pod Vtáčnikom', short: 'BLV', city: 'Lehota pod Vtáčnikom', reg: 'Z', stadium: 'Štadión Lehota pod Vtáčnikom',
    kit: ['#111111', '#1f8a3b', '#111111', 'stripes'], budget: 180000, base: 53, squad: `` },
  { key: 'zilinab', lvl: 2, name: 'MŠK Žilina B', short: 'ZIB', city: 'Žilina', reg: 'S', stadium: 'Štadión pod Dubňom',
    kit: ['#ffd200', '#00843d', '#00843d', 'plain'], budget: 150000, base: 54, parent: 'zilina', young: true, squad: `` },
  { key: 'slovanb', lvl: 2, name: 'ŠK Slovan Bratislava B', short: 'SLB', city: 'Bratislava', reg: 'Z', stadium: 'Tehelné pole',
    kit: ['#5bb6ec', '#ffffff', '#ffffff', 'sleeves'], budget: 150000, base: 55, parent: 'slovan', young: true, squad: `` },
];
