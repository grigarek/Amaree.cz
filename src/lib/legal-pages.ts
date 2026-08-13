import type { Locale } from "@/i18n/routing";
import { localizedPaths } from "@/i18n/routing";
import { company } from "@/lib/config/company";

export type LegalPageKey = "terms" | "privacy" | "returns" | "shipping" | "care";
export type LegalSection = { title: string; paragraphs?: string[]; items?: string[] };
export type LegalPageContent = { title: string; intro: string; notice?: string; sections: LegalSection[] };

const addressCs = `${company.legalName}, ${company.address.street}, ${company.address.district}, ${company.address.postalCode} ${company.address.city}, ${company.address.country}`;
const addressSk = `${company.legalName}, ${company.address.street}, ${company.address.district}, ${company.address.postalCode} ${company.address.city}, Česká republika`;
const addressEn = `${company.legalName}, ${company.address.street}, ${company.address.district}, ${company.address.postalCode} ${company.address.city}, Czech Republic`;
const addressDe = `${company.legalName}, ${company.address.street}, ${company.address.district}, ${company.address.postalCode} ${company.address.city}, Tschechische Republik`;

const legalPageOrder: LegalPageKey[] = ["shipping", "returns", "care", "privacy", "terms"];

export function getLegalPageContent(locale: Locale, route: string): LegalPageContent {
  const key = Object.entries(localizedPaths[locale]).find(([, value]) => value === route)?.[0] as LegalPageKey | undefined;
  return content[locale][key ?? "terms"];
}

export function getLegalPageNavigation(locale: Locale) {
  return legalPageOrder.map((key) => ({
    href: localizedPaths[locale][key],
    label: content[locale][key].title
  }));
}

const content: Record<Locale, Record<LegalPageKey, LegalPageContent>> = {
  cs: {
    terms: {
      title: "Obchodní podmínky",
      intro: "Pravidla nákupu v internetovém obchodě AMARÉE, provozovaném společností MEDIANUM s.r.o.",
      sections: [
        {
          title: "1. Kdo e-shop provozuje",
          paragraphs: [
            `Prodávajícím a provozovatelem internetového obchodu AMARÉE je ${addressCs}, IČO ${company.companyId}, zapsaná v obchodním rejstříku vedeném Krajským soudem v Ostravě, oddíl C, vložka 24429. Společnost není plátcem DPH.`,
            `Kontaktovat nás můžete na e-mailu ${company.email} nebo telefonu ${company.phone}. Tyto obchodní podmínky upravují nákup spotřebitelů prostřednictvím e-shopu AMARÉE.`
          ]
        },
        {
          title: "2. Nabídka zboží a ceny",
          paragraphs: [
            "U každého šperku uvádíme jeho hlavní vlastnosti, materiál, rozměry, cenu a dostupnost. Fotografie mají co nejvěrněji zachytit výrobek; drobné rozdíly v odstínu mohou vzniknout nastavením displeje nebo charakterem materiálu.",
            "Ceny pro český trh jsou uvedeny v Kč. Prodávající není plátcem DPH. Cena dopravy a případný poplatek za dobírku se zobrazí před odesláním objednávky. Při slevové akci se postupuje podle pravidel pro uvádění předchozí ceny."
          ]
        },
        {
          title: "3. Objednávka a uzavření smlouvy",
          paragraphs: [
            "Zákazník vloží zboží do košíku, zvolí dopravu a platbu, vyplní potřebné údaje a před odesláním může objednávku zkontrolovat a opravit. Objednávku odešle tlačítkem, které jednoznačně vyjadřuje povinnost zaplatit.",
            "Objednávka představuje návrh na uzavření kupní smlouvy. Kupní smlouva vzniká doručením potvrzení prodávajícího, které objednávku výslovně přijímá. Automatická zpráva potvrzující pouze přijetí dat nemusí být přijetím objednávky, pokud je tak v e-mailu uvedeno.",
            "Potvrzení objednávky bude odesláno na zadaný e-mail. Zákazník odpovídá za správnost kontaktních a doručovacích údajů. Prodávající může objednávku před přijetím odmítnout zejména při nedostupnosti zboží, zjevné chybě ceny nebo podezření na zneužití e-shopu."
          ]
        },
        {
          title: "4. Platba",
          items: [
            "Online platba prostřednictvím GoPay; konkrétní dostupné metody zobrazí platební brána podle aktivace obchodního účtu.",
            `Klasický bankovní převod na účet ${company.bankAccount}; jako variabilní symbol zákazník uvede číslo objednávky. Platbu je třeba připsat do 3 kalendářních dnů, jinak může být objednávka zrušena.`,
            "Dobírka stojí v Česku 39 Kč a na Slovensku 1,50 EUR a je dostupná pouze pro služby Packety, u kterých ji dopravce podporuje a má ji obchodní účet aktivovanou."
          ]
        },
        {
          title: "5. Doprava a převzetí",
          paragraphs: [
            "Aktuální dopravní metody, ceny a podmínky jsou uvedeny na stránce Doprava a platba a vždy také v objednávce. Zboží je doručeno na zadanou adresu, vybrané výdejní místo nebo Z-BOX.",
            "Při převzetí doporučujeme zkontrolovat stav obalu. Je-li zásilka zjevně poškozena, zákazník může stav zdokumentovat a oznámit dopravci i AMARÉE. Tím nejsou omezena zákonná práva z vadného plnění."
          ]
        },
        {
          title: "6. Odstoupení a dobrovolné vrácení",
          paragraphs: [
            "Spotřebitel může od smlouvy uzavřené přes internet bez udání důvodu odstoupit do 14 dnů od převzetí zboží, pokud nejde o zákonnou výjimku. Oznámení stačí ve lhůtě odeslat na info@amaree.cz. Podrobný postup je na stránce Výměna, vrácení a reklamace.",
            "AMARÉE nad rámec zákona nabízí možnost vrátit do 30 dnů nenošené, nepoškozené, čisté a kompletní zboží. Pro tuto dobrovolnou službu může být požadováno původní balení. Přímé náklady na odeslání zboží zpět hradí zákazník."
          ]
        },
        {
          title: "7. Práva z vadného plnění",
          paragraphs: [
            "Prodávající odpovídá, že zboží při převzetí nemá vady a odpovídá ujednaným vlastnostem. Spotřebitel může vadu, která se projeví do dvou let od převzetí, vytknout v souladu s občanským zákoníkem.",
            "Podle povahy vady může spotřebitel požadovat opravu nebo výměnu. Jsou-li splněny zákonné podmínky, může požadovat přiměřenou slevu nebo od smlouvy odstoupit. Podrobný postup obsahuje stránka Výměna, vrácení a reklamace."
          ]
        },
        {
          title: "8. Mimosoudní řešení sporů",
          paragraphs: [
            "Případné podněty se nejprve pokusíme vyřešit přímo. Pokud se spotřebitelský spor nepodaří vyřešit dohodou, může spotřebitel podat návrh České obchodní inspekci, Ústřední inspektorát – oddělení ADR, Gorazdova 1969/24, 120 00 Praha 2, e-mail adr@coi.gov.cz, web coi.gov.cz/informace-o-adr/."
          ]
        },
        {
          title: "9. Závěrečná ustanovení",
          paragraphs: [
            "Kupní smlouva se řídí českým právem. Tím nejsou spotřebitelé zbaveni ochrany, kterou jim poskytují kogentní předpisy země jejich obvyklého bydliště, pokud se použijí.",
            "Změny podmínek se nedotýkají práv a povinností vzniklých za účinnosti předchozího znění. Tyto obchodní podmínky jsou účinné od 1. 8. 2026."
          ]
        }
      ]
    },
    privacy: {
      title: "Ochrana osobních údajů",
      intro: "Přehled toho, jak AMARÉE pracuje s osobními údaji zákazníků a návštěvníků e-shopu.",
      sections: [
        {
          title: "1. Správce osobních údajů",
          paragraphs: [
            `Správcem osobních údajů je ${addressCs}, IČO ${company.companyId}. Ve věcech ochrany osobních údajů nás můžete kontaktovat na ${company.email}. Správce nejmenoval pověřence pro ochranu osobních údajů.`
          ]
        },
        {
          title: "2. Jaké údaje zpracováváme",
          items: [
            "Identifikační a kontaktní údaje, zejména jméno, e-mail, telefon a doručovací nebo fakturační adresa.",
            "Údaje o objednávce, vybraném zboží, platbě, dopravě, výdejním místě, vrácení a reklamaci.",
            "Komunikaci se zákaznickou podporou a údaje potřebné k ochraně právních nároků.",
            "Technické a bezpečnostní údaje, například IP adresu, čas požadavku a nezbytné záznamy o provozu e-shopu.",
            "E-mail a záznam o souhlasu nebo odmítnutí, pokud se zákazník přihlásí k newsletteru.",
            "Volitelně den a měsíc narození, pokud zákazník využije narozeninovou odměnu v zákaznickém účtu. Rok narození ani celé datum narození neukládáme."
          ]
        },
        {
          title: "3. Účely a právní základy",
          items: [
            "Vyřízení objednávky, platby, dopravy a komunikace před uzavřením smlouvy a při jejím plnění – plnění smlouvy nebo kroky před jejím uzavřením.",
            "Účetní, daňové a další zákonné evidence – plnění právní povinnosti.",
            "Reklamace, vratky, prevence zneužití a ochrana právních nároků – plnění smlouvy, právní povinnost nebo oprávněný zájem.",
            "Newsletter pro osoby, které nejsou zákazníky – souhlas, který lze kdykoli odvolat.",
            "Nabídky vlastních obdobných výrobků stávajícím zákazníkům – oprávněný zájem a pravidla elektronického marketingu, vždy s jednoduchou možností odmítnutí.",
            "Narozeninová odměna – souhlas zákazníka vyjádřený dobrovolným zadáním dne a měsíce narození; údaj lze opravit prostřednictvím zákaznické podpory."
          ]
        },
        {
          title: "4. Příjemci a poskytovatelé služeb",
          paragraphs: [
            "Údaje předáváme jen v rozsahu nezbytném pro konkrétní službu. Pro provoz e-shopu využíváme Cloudflare (hosting a doručování webu), Supabase (databáze, přihlášení a úložiště), Active24/Websupport (doména a e-mail), Resend (transakční e-maily) a Ecomail (newsletter, pokud se k němu zákazník přihlásí). Tito dodavatelé mohou podle povahy služby zpracovávat údaje naším jménem na základě smluvních podmínek a pokynů.",
            "Podle zvolené dopravy nebo platby předáváme nezbytné údaje také společnosti Packeta a platební bráně GoPay. Při poskytování přepravních a platebních služeb mohou tito příjemci vystupovat jako samostatní správci a plnit vlastní zákonné povinnosti. Údaje mohou dále obdržet externí účetní, daňoví nebo právní poradci a orgány veřejné moci, pokud to vyžaduje zákon.",
            "Někteří technologičtí dodavatelé mohou zapojovat subdodavatele nebo zpracovávat údaje mimo Evropský hospodářský prostor. V takovém případě musí být přenos založen na odpovídajícím právním mechanismu a smluvních zárukách podle GDPR."
          ]
        },
        {
          title: "5. Jak dlouho údaje uchováváme",
          items: [
            "Objednávkové a související zákaznické údaje uchováváme po dobu vyřízení smlouvy a následně zpravidla 3 roky kvůli ochraně právních nároků; při probíhajícím sporu nebo reklamaci po dobu nezbytnou k jejich ukončení.",
            "Účetní doklady a související záznamy uchováváme po dobu vyžadovanou účetními a daňovými předpisy, zpravidla 5 let od konce účetního období; vyžaduje-li konkrétní předpis delší dobu, použije se tato delší doba.",
            "Údaje o reklamacích a vrácení zboží uchováváme po dobu vyřízení a následně zpravidla 3 roky kvůli doložení splnění povinností a ochraně právních nároků.",
            "Newsletterové údaje uchováváme do odvolání souhlasu nebo vznesení námitky. Nezbytný záznam o odhlášení můžeme dále uchovat, abychom respektovali zákaz dalšího zasílání a doložili jeho splnění.",
            "Den a měsíc narození uchováváme po dobu trvání zákaznického účtu nebo do odvolání souhlasu; následně údaj odstraníme, nebrání-li tomu zákonná povinnost.",
            "Bezpečnostní a provozní logy uchováváme pouze po přiměřenou dobu potřebnou k ochraně e-shopu; při bezpečnostním incidentu mohou být příslušné záznamy uchovány déle do jeho vyřešení."
          ]
        },
        {
          title: "6. Vaše práva",
          items: [
            "Právo na přístup k osobním údajům a na jejich opravu.",
            "Právo na výmaz nebo omezení zpracování, pokud jsou splněny podmínky GDPR.",
            "Právo na přenositelnost údajů a právo vznést námitku proti zpracování založenému na oprávněném zájmu.",
            "Právo kdykoli odvolat souhlas, aniž je dotčena zákonnost předchozího zpracování.",
            "Právo podat stížnost u Úřadu pro ochranu osobních údajů, Pplk. Sochora 27, 170 00 Praha 7, uoou.gov.cz."
          ]
        },
        {
          title: "7. Zabezpečení a automatizované rozhodování",
          paragraphs: [
            "Používáme přiměřená technická a organizační opatření, řízení přístupů a šifrovaný přenos dat. Přístup mají pouze osoby, které jej potřebují pro svou práci. E-shop neprovádí automatizované individuální rozhodování, které by mělo pro zákazníka právní nebo obdobně významné účinky."
          ]
        },
        {
          title: "8. Cookies a newsletter",
          paragraphs: [
            "V současné verzi e-shop používá pouze nezbytné cookies nebo obdobné lokální úložiště pro zabezpečení, přihlášení administrátora, fungování košíku a uložení volby cookies. Analytické a marketingové technologie nebudou aktivovány bez předchozího souhlasu návštěvníka.",
            "Každý newsletter musí být označen jako obchodní sdělení, uvádět odesílatele a obsahovat jednoduché bezplatné odhlášení."
          ]
        }
      ]
    },
    returns: {
      title: "Výměna, vrácení a reklamace",
      intro: "Srozumitelný postup pro zákonné odstoupení, dobrovolné 30denní vrácení i reklamaci šperku.",
      sections: [
        {
          title: "1. Nejdříve nám napište",
          paragraphs: [
            `Pošlete e-mail na ${company.email} a uveďte číslo objednávky, název zboží a zda chcete odstoupit, využít dobrovolné vrácení, požádat o výměnu nebo uplatnit reklamaci. U reklamace přidejte popis vady a pokud možno fotografie. Odpovíme s evidenčními údaji a dalším postupem.`
          ]
        },
        {
          title: "2. Kam zboží poslat",
          paragraphs: [
            `Zboží bezpečně zabalte a odešlete na adresu: ${addressCs}. Do zásilky přiložte číslo objednávky a své kontaktní údaje, abychom ji mohli správně přiřadit.`,
            "Zásilku neposílejte na dobírku; takovou zásilku nemůžeme převzít. Zvolte sledovanou dopravu a uschovejte si doklad o odeslání."
          ]
        },
        {
          title: "3. Zákonné odstoupení do 14 dnů",
          paragraphs: [
            "Spotřebitel může od smlouvy uzavřené přes internet odstoupit bez udání důvodu do 14 dnů od převzetí zboží, pokud nejde o zákonnou výjimku. Stačí, když ve lhůtě odešle jednoznačné oznámení e-mailem nebo poštou. Zboží následně odešle nebo předá do 14 dnů od odstoupení.",
            "Přímé náklady na vrácení nese zákazník. Původní balení je doporučené, ale není automatickou podmínkou zákonného odstoupení. Zákazník odpovídá pouze za snížení hodnoty vzniklé zacházením nad rámec nutného seznámení se s povahou a vlastnostmi zboží."
          ]
        },
        {
          title: "4. Dobrovolné vrácení AMARÉE do 30 dnů",
          paragraphs: [
            "Nad rámec zákonné lhůty přijímáme do 30 dnů od převzetí také nenošené, nepoškozené, čisté a kompletní zboží včetně původního balení. Tato nadstandardní možnost se neuplatní na zboží upravené na přání ani na zboží, které nesplňuje uvedené podmínky.",
            "Náklady na dopravu zpět hradí zákazník. Přijetí zboží nejprve zkontrolujeme a poté potvrdíme výsledek."
          ]
        },
        {
          title: "5. Vrácení peněz a výměna",
          paragraphs: [
            "Při zákonném odstoupení vrátíme přijaté peníze včetně nákladů na nejlevnější nabízený standardní způsob dodání do 14 dnů od odstoupení, zpravidla stejnou platební metodou. S vrácením můžeme počkat do obdržení zboží nebo dokladu o jeho odeslání.",
            "Výměna závisí na skladové dostupnosti. Pokud přímá výměna nebude možná, domluvíme vrácení původního zboží a vytvoření nové objednávky."
          ]
        },
        {
          title: "6. Jak uplatnit reklamaci",
          paragraphs: [
            "Uveďte číslo objednávky, reklamované zboží, popis vady, kdy se vada projevila a jaké řešení požadujete. Doklad o koupi pomáhá objednávku dohledat, není však jediným možným důkazem nákupu.",
            "Při přijetí reklamace vystavíme potvrzení o datu uplatnění, obsahu reklamace a požadovaném způsobu vyřízení. Následně zákazníka informujeme o výsledku a způsobu vyřízení."
          ]
        },
        {
          title: "7. Lhůta a možná řešení reklamace",
          paragraphs: [
            "Reklamaci včetně odstranění vady vyřídíme bez zbytečného odkladu, nejpozději do 30 kalendářních dnů od jejího uplatnění, pokud se se spotřebitelem nedohodneme na delší lhůtě.",
            "Podle zákonných podmínek může zákazník požadovat opravu nebo výměnu, případně přiměřenou slevu nebo odstoupení od smlouvy. Běžné opotřebení, mechanické poškození, nevhodné používání nebo prokazatelné nedodržení pokynů k péči není vadou výrobku; každý případ posuzujeme individuálně."
          ]
        },
        {
          title: "8. Vzor oznámení o odstoupení",
          paragraphs: [
            `Adresát: ${company.legalName}, ${company.address.street}, ${company.address.district}, ${company.address.postalCode} ${company.address.city}, ${company.address.country}, ${company.email}.`,
            "Oznamuji, že odstupuji od kupní smlouvy. Číslo objednávky: ____. Objednané zboží: ____. Datum objednání a převzetí: ____. Jméno a příjmení spotřebitele: ____. Adresa spotřebitele: ____. Číslo účtu pro vrácení peněz, pokud se na něm dohodneme: ____. Datum a podpis, je-li oznámení zasíláno v listinné podobě: ____."
          ]
        },
        {
          title: "9. Vzor uplatnění reklamace",
          paragraphs: [
            `Reklamaci zašlete na ${company.email} nebo na adresu ${company.legalName}, ${company.address.street}, ${company.address.district}, ${company.address.postalCode} ${company.address.city}.`,
            "Číslo objednávky: ____. Reklamované zboží: ____. Popis vady a datum, kdy se projevila: ____. Požadovaný způsob vyřízení: oprava / výměna / přiměřená sleva / odstoupení, jsou-li splněny zákonné podmínky. Jméno, adresa, e-mail a telefon zákazníka: ____. Datum: ____."
          ]
        }
      ]
    },
    shipping: {
      title: "Doprava a platba",
      intro: "Přehled připravených způsobů doručení, cen a platebních možností AMARÉE.",
      sections: [
        {
          title: "Doprava po České republice",
          items: [
            "Packeta – výdejní místo nebo Z-BOX: 95 Kč.",
            "Packeta – doručení na adresu: 119 Kč.",
            "Doprava je zdarma při hodnotě zboží po slevě od 1 500 Kč. Případný poplatek za dobírku se účtuje i při dopravě zdarma."
          ]
        },
        {
          title: "Doprava na Slovensko",
          items: [
            "Packeta – výdejní místo nebo Z-BOX: 8,50 EUR.",
            "Packeta – doručení na adresu: 8,50 EUR.",
            "Dobírka: příplatek 1,50 EUR pouze u konkrétních služeb, pro které ji podporuje a má aktivovanou Packeta.",
            "Při dobírce je celková cena dopravy a platebního poplatku 10,00 EUR. Při online platbě je doprava 8,50 EUR.",
            "Doprava zdarma se na Slovensko zatím neposkytuje."
          ]
        },
        {
          title: "Výdejní místo a Z-BOX",
          paragraphs: [
            "Výdejní místo se vybírá v košíku prostřednictvím widgetu Packeta. Po expedici předává informace o pohybu zásilky a podmínkách vyzvednutí dopravce e-mailem nebo SMS. Dobu uložení určuje konkrétní typ výdejního místa a aktuální podmínky Packety."
          ]
        },
        {
          title: "Možnosti platby",
          items: [
            "GoPay: bez poplatku. Konkrétní online metody, například karta nebo podporovaná elektronická peněženka, se zobrazí podle aktivace obchodního účtu.",
            `Bankovní převod: bez poplatku, účet ${company.bankAccount}, variabilní symbol je číslo objednávky. Zboží rezervujeme 3 kalendářní dny.`,
            "Dobírka v Česku: 39 Kč u podporovaných služeb Packety. Dobírka na Slovensku: 1,50 EUR u podporovaných služeb Packety. Dostupnost Z-BOXu a dalších konkrétních služeb se zobrazí pouze po jejich ověření v obchodním účtu."
          ]
        },
        {
          title: "Zpracování a doručení objednávky",
          paragraphs: [
            "Před odesláním objednávky zákazník uvidí cenu zboží, dopravy, případný platební poplatek a celkovou cenu. Informaci o přijetí objednávky a následně o expedici zašleme e-mailem.",
            "Přesný předpokládaný termín expedice bude uveden u objednávky podle skladové dostupnosti. Dodací doba dopravce začíná běžet po předání zásilky a může být ovlivněna jeho provozem."
          ]
        },
        {
          title: "Poškozená nebo nedoručená zásilka",
          paragraphs: [
            `Pokud zásilka dorazí poškozená nebo se její pohyb neobvykle dlouho nemění, napište na ${company.email} a přiložte číslo objednávky, případně fotografie obalu. Pomůžeme s dalším postupem vůči dopravci.`
          ]
        }
      ]
    },
    care: {
      title: "Péče o šperky",
      intro: "Jednoduchá pravidla, díky kterým si šperky AMARÉE déle zachovají svůj vzhled a lesk.",
      notice: "Vždy má přednost materiál a konkrétní pokyny uvedené u daného produktu.",
      sections: [
        {
          title: "1. Základní pravidlo",
          paragraphs: [
            "Šperk nasazujte jako poslední po použití parfému, krému, laku na vlasy a další kosmetiky. Po příchodu domů jej naopak sundejte jako první. Tím omezíte kontakt povrchu s chemickými látkami a mechanické namáhání."
          ]
        },
        {
          title: "2. Kdy šperk odložit",
          items: [
            "Před sprchováním, koupáním, plaváním, saunou a pobytem v termální nebo chlorované vodě.",
            "Před sportem, spaním, úklidem, prací na zahradě a jinou manuální činností.",
            "Při práci s čisticími prostředky, dezinfekcí, barvami nebo jinými chemikáliemi.",
            "Kdykoli hrozí zachycení řetízku, deformace zapínání nebo uvolnění kamínku či dekorace."
          ]
        },
        {
          title: "3. Čištění",
          paragraphs: [
            "Po nošení šperk jemně otřete suchým měkkým hadříkem. Nepoužívejte abrazivní houbičky, zubní pastu, agresivní čističe ani domácí chemické směsi. Silně znečištěný šperk nebo šperk s jemnými kameny svěřte raději odbornému čištění.",
            "U perleti, lepených dekorací a citlivých kamenů nepoužívejte ultrazvukovou čističku, pokud to výslovně nedovolují pokyny konkrétního produktu."
          ]
        },
        {
          title: "4. Stříbro a přirozená oxidace",
          paragraphs: [
            "Pokud je šperk vyroben ze stříbra, může jeho povrch přirozeně oxidovat a tmavnout vlivem vzduchu, potu, kosmetiky nebo pH pokožky. Samotné tmavnutí nemusí znamenat vadu materiálu a lze je často odstranit vhodným hadříkem na stříbro.",
            "Běžné lehké ztmavnutí čistěte jemným hadříkem určeným na stříbro bez silného tlaku. Tekutý čistič použijte pouze tehdy, pokud je vhodný také pro kameny, dekorace a konkrétní povrch daného šperku.",
            "U pozlaceného stříbra nepoužívejte abrazivní pasty ani intenzivní leštění, které by mohlo povrchovou vrstvu zeslabit. Perly, lepené dekorace a citlivé kameny nevkládejte do čisticí lázně bez výslovného doporučení pro konkrétní výrobek."
          ]
        },
        {
          title: "5. Ukládání",
          paragraphs: [
            "Šperky ukládejte suché, mimo přímé slunce a odděleně od sebe do krabičky nebo měkkého sáčku. Řetízky zapněte a položte tak, aby se nezauzlovaly. Šperky nenoste volně v kabelce nebo peněžence společně s mincemi a klíči."
          ]
        },
        {
          title: "6. Kdy se na nás obrátit",
          paragraphs: [
            `Nejste-li si jistí materiálem nebo správným čištěním konkrétního šperku, napište na ${company.email}. Při uvolněném zapínání, kamínku nebo jiné změně šperk dál nenoste, aby se poškození nezvětšilo.`
          ]
        }
      ]
    }
  },
  sk: {
    terms: {
      title: "Obchodné podmienky",
      intro: "Pravidlá nákupu v internetovom obchode AMARÉE pre zákazníkov zo Slovenska.",
      sections: [
        { title: "1. Prevádzkovateľ", paragraphs: [`Predávajúcim a prevádzkovateľom je ${addressSk}, IČO ${company.companyId}, zapísaná v obchodnom registri vedenom Krajským súdom v Ostrave, oddiel C, vložka 24429. Spoločnosť nie je platiteľom DPH. Kontakt: ${company.email}, ${company.phone}.`] },
        { title: "2. Tovar a ceny", paragraphs: ["Pri každom šperku uvádzame jeho hlavné vlastnosti, materiál, rozmery, cenu a dostupnosť. Drobné rozdiely v odtieni môžu vzniknúť nastavením displeja alebo charakterom materiálu.", "Ceny pre slovenský trh sú uvedené v eurách. Cena dopravy a prípadný poplatok za dobierku sa zobrazia pred odoslaním objednávky."] },
        { title: "3. Objednávka a uzavretie zmluvy", paragraphs: ["Zákazník vloží tovar do košíka, zvolí dopravu a platbu, vyplní potrebné údaje a pred odoslaním môže objednávku skontrolovať a opraviť. Objednávku odošle tlačidlom, ktoré jednoznačne vyjadruje povinnosť zaplatiť.", "Kúpna zmluva vzniká potvrdením objednávky predávajúcim. Predávajúci môže objednávku pred prijatím odmietnuť najmä pri nedostupnosti tovaru, zjavnej chybe ceny alebo podozrení na zneužitie e-shopu."] },
        { title: "4. Platba a doprava", items: ["Online platba cez GoPay metódami aktivovanými pre obchodný účet.", "Dobierka za 1,50 € iba pri službách Packety, pri ktorých ju dopravca a obchodný účet podporujú.", "Packeta na adresu, výdajné miesto alebo Z-BOX za 8,50 €. Doprava zdarma sa na Slovensko zatiaľ neposkytuje."] },
        { title: "5. Odstúpenie a dobrovoľné vrátenie", paragraphs: ["Spotrebiteľ môže od zmluvy uzavretej cez internet bez uvedenia dôvodu odstúpiť do 14 dní od prevzatia tovaru, ak nejde o zákonnú výnimku. Oznámenie stačí v lehote odoslať na info@amaree.cz.", "AMARÉE navyše ponúka možnosť vrátiť do 30 dní nenosený, nepoškodený, čistý a kompletný tovar za podmienok uvedených na stránke Výmena, vrátenie a reklamácie. Priame náklady na spätné odoslanie hradí zákazník."] },
        { title: "6. Práva z chybného plnenia", paragraphs: ["Predávajúci zodpovedá za to, že tovar pri prevzatí nemá vady a zodpovedá dohodnutým vlastnostiam. Spotrebiteľ môže uplatniť zákonné práva, ak sa vada prejaví v zákonnej lehote.", "Podľa povahy vady môže spotrebiteľ požadovať opravu alebo výmenu a pri splnení zákonných podmienok primeranú zľavu alebo odstúpenie od zmluvy."] },
        { title: "7. Riešenie sporov", paragraphs: ["Podnety sa najprv pokúsime vyriešiť priamo. Mimosúdne riešenie spotrebiteľského sporu zabezpečuje Česká obchodná inšpekcia; cezhraničnú pomoc poskytuje aj Európske spotrebiteľské centrum Slovensko."] },
        { title: "8. Záverečné ustanovenia", paragraphs: ["Zmluva sa riadi českým právom. Tým spotrebiteľ nie je zbavený ochrany, ktorú mu poskytujú záväzné predpisy krajiny jeho obvyklého bydliska.", "Tieto obchodné podmienky sú účinné od 1. 8. 2026."] }
      ]
    },
    privacy: {
      title: "Ochrana osobných údajov",
      intro: "Ako AMARÉE spracúva osobné údaje zákazníkov a návštevníkov e-shopu.",
      sections: [
        { title: "1. Prevádzkovateľ", paragraphs: [`Prevádzkovateľom osobných údajov je ${addressSk}, IČO ${company.companyId}. Otázky k ochrane údajov posielajte na ${company.email}.`] },
        { title: "2. Spracúvané údaje", items: ["Identifikačné, kontaktné, doručovacie a fakturačné údaje.", "Údaje o objednávke, platbe, doprave, výdajnom mieste, vrátení a reklamácii.", "Komunikácia so zákazníkom a primerané technické a bezpečnostné záznamy.", "E-mail a záznam súhlasu alebo odhlásenia pri newsletteri.", "Voliteľne deň a mesiac narodenia, ak zákazník využije narodeninovú odmenu. Rok narodenia ani celý dátum narodenia neukladáme."] },
        { title: "3. Účely a právne základy", items: ["Vybavenie objednávky, platby a doručenia – plnenie zmluvy.", "Účtovníctvo a zákonná evidencia – splnenie právnej povinnosti.", "Reklamácie, ochrana práv a prevencia zneužitia – zmluva, právna povinnosť alebo oprávnený záujem.", "Newsletter – súhlas alebo pravidlá pre ponuku podobných vlastných produktov existujúcim zákazníkom.", "Narodeninová odmena – súhlas vyjadrený dobrovoľným zadaním dňa a mesiaca narodenia."] },
        { title: "4. Príjemcovia", paragraphs: ["Údaje poskytujeme iba v potrebnom rozsahu službám Cloudflare, Supabase, Active24/Websupport, Resend a Ecomail a podľa zvolenej služby tiež spoločnostiam Packeta a GoPay. Údaje môžu dostať aj oprávnení poradcovia alebo orgány verejnej moci."] },
        { title: "5. Uchovávanie", items: ["Objednávkové údaje spravidla počas vybavenia a následne 3 roky na ochranu právnych nárokov.", "Účtovné doklady počas zákonnej lehoty.", "Reklamačné údaje spravidla 3 roky po ukončení prípadu.", "Newsletter do odvolania súhlasu alebo námietky; minimálny záznam o odhlásení môže zostať zachovaný.", "Deň a mesiac narodenia do zrušenia zákazníckeho účtu alebo odvolania súhlasu."] },
        { title: "6. Vaše práva", items: ["Prístup k údajom a ich oprava.", "Vymazanie alebo obmedzenie pri splnení podmienok GDPR.", "Prenosnosť údajov a námietka proti spracúvaniu na základe oprávneného záujmu.", "Odvolanie súhlasu a sťažnosť dozornému úradu."] },
        { title: "7. Bezpečnosť a cookies", paragraphs: ["Používame primerané bezpečnostné opatrenia, riadenie prístupov a šifrovaný prenos. Nevyhnutné technológie zabezpečujú funkciu košíka a bezpečnosť; analytické a marketingové technológie sa aktivujú iba s príslušným súhlasom."] }
      ]
    },
    returns: {
      title: "Výmena, vrátenie a reklamácie",
      intro: "Postup pri zákonnom odstúpení, dobrovoľnom 30-dňovom vrátení a reklamácii.",
      sections: [
        { title: "1. Najprv nás kontaktujte", paragraphs: [`Napíšte na ${company.email} a uveďte číslo objednávky, produkt a požadovaný postup. Pri reklamácii opíšte vadu a podľa možnosti priložte fotografie.`] },
        { title: "2. Adresa na zaslanie", paragraphs: [`Bezpečne zabalený tovar pošlite na ${addressSk}. Priložte číslo objednávky a kontakt. Zásielku neposielajte na dobierku a uschovajte si potvrdenie o odoslaní.`] },
        { title: "3. Zákonné odstúpenie do 14 dní", paragraphs: ["Spotrebiteľ môže oznámiť odstúpenie do 14 dní od prevzatia a tovar následne odoslať v zákonnej lehote, ak nejde o zákonnú výnimku. Priame náklady na spätné odoslanie hradí zákazník."] },
        { title: "4. Dobrovoľné vrátenie do 30 dní", paragraphs: ["AMARÉE navyše prijíma do 30 dní nenosený, nepoškodený, čistý a kompletný tovar v pôvodnom balení. Personalizovaný alebo inak zákonne vylúčený tovar nemožno takto vrátiť."] },
        { title: "5. Vrátenie platby a výmena", paragraphs: ["Pri zákonnom odstúpení vrátime platbu vrátane nákladov na najlacnejší ponúkaný štandardný spôsob doručenia v zákonnej lehote, spravidla rovnakým spôsobom platby. S vrátením môžeme počkať do prijatia tovaru alebo dokladu o jeho odoslaní."] },
        { title: "6. Reklamácia", paragraphs: ["Uveďte objednávku, produkt, opis vady, čas jej prejavenia a požadovaný spôsob nápravy. Prijatie aj výsledok reklamácie potvrdíme a vybavíme ju v zákonnej lehote.", "Podľa zákonných podmienok prichádza do úvahy oprava, výmena, primeraná zľava alebo odstúpenie od zmluvy."] }
      ]
    },
    shipping: {
      title: "Doprava a platba",
      intro: "Spôsoby doručenia, ceny a platobné možnosti pre Slovensko.",
      sections: [
        { title: "Doručenie na Slovensko", items: ["Packeta – výdajné miesto alebo Z-BOX: 8,50 €.", "Packeta – doručenie na adresu: 8,50 €.", "Doprava zdarma sa na Slovensko zatiaľ neposkytuje."] },
        { title: "Platba", items: ["GoPay: bez poplatku; konkrétne online metódy závisia od aktivácie obchodného účtu.", "Dobierka: 1,50 €, iba pri službách overených ako podporované v účte Packety.", "Bankový prevod v EUR sa nezobrazuje, kým nebude doplnený a overený účet IBAN."] },
        { title: "Spracovanie objednávky", paragraphs: ["Úplná cena v eurách sa zobrazí pred odoslaním objednávky. Prijatie objednávky a odoslanie zásielky potvrdíme e-mailom."] },
        { title: "Sledovanie zásielky", paragraphs: ["Po odovzdaní zásielky dopravcovi pošleme e-mail s dostupným sledovacím odkazom alebo číslom zásielky. Aktuálny pohyb zásielky následne zobrazuje systém Packety."] },
        { title: "Poškodená alebo oneskorená zásielka", paragraphs: [`Kontaktujte ${company.email}, uveďte číslo objednávky a podľa potreby priložte fotografie obalu. Pomôžeme koordinovať ďalší postup s dopravcom.`] }
      ]
    },
    care: {
      title: "Starostlivosť o šperky",
      intro: "Jednoduché návyky, ktoré pomáhajú šperkom AMARÉE zachovať vzhľad a lesk.",
      notice: "Materiál a pokyny uvedené pri konkrétnom produkte majú vždy prednosť.",
      sections: [
        { title: "1. Každodenná starostlivosť", paragraphs: ["Šperk si nasaďte až po použití parfumov, krémov a vlasových prípravkov. Po nosení ho jemne utrite suchou mäkkou handričkou."] },
        { title: "2. Kedy šperk odložiť", items: ["Pred sprchovaním, plávaním, saunou a pobytom v chlórovanej alebo termálnej vode.", "Pred športom, spánkom, upratovaním a manuálnou prácou.", "Pri práci s chemikáliami alebo riziku zachytenia retiazky či zapínania."] },
        { title: "3. Čistenie", paragraphs: ["Nepoužívajte abrazívne pomôcky, zubnú pastu ani agresívne čističe. Perly, lepené prvky a jemné kamene nečistite ultrazvukom, ak to výslovne nepovoľuje návod produktu."] },
        { title: "4. Striebro a prirodzená oxidácia", paragraphs: ["Striebro môže prirodzene oxidovať a tmavnúť vplyvom vzduchu, potu, kozmetiky alebo pH pokožky. Ľahké stmavnutie jemne odstráňte handričkou určenou na striebro.", "Pri pozlátenom striebre nepoužívajte abrazívne pasty ani intenzívne leštenie. Tekutý čistič alebo čistiaci kúpeľ použite iba vtedy, ak je vhodný aj pre kamene, dekorácie a konkrétny povrch šperku."] },
        { title: "5. Uloženie", paragraphs: ["Šperky ukladajte suché, mimo priameho slnka a oddelene v šperkovnici alebo mäkkom vrecku. Retiazky pred uložením zapnite."] },
        { title: "6. Potrebujete poradiť?", paragraphs: [`Pri otázkach k starostlivosti o konkrétny šperk napíšte na ${company.email}.`] }
      ]
    }
  },
  en: {
    terms: {
      title: "Terms and Conditions",
      intro: "Rules for purchases from the AMARÉE online store operated by MEDIANUM s.r.o.",
      sections: [
        { title: "1. Store operator", paragraphs: [`The seller and operator is ${addressEn}, Company ID ${company.companyId}, registered with ${company.registerEntry}. The company is not VAT registered. Contact: ${company.email}, ${company.phone}.`] },
        { title: "2. Products and prices", paragraphs: ["Each product page states the main characteristics, material, dimensions, price and availability. Czech-market prices are shown in CZK. Shipping and any cash-on-delivery fee are displayed before the order is submitted."] },
        { title: "3. Order and contract", paragraphs: ["Customers review and correct their order before submitting it through a button that clearly states the obligation to pay. The order is an offer to conclude a purchase contract; the contract is concluded when the seller sends an explicit acceptance.", "An order confirmation is sent by e-mail. The seller may reject an order before acceptance if stock is unavailable, the price contains an obvious error or the store is being misused."] },
        { title: "4. Payment and delivery", items: [`GoPay online payment using methods enabled for the merchant account.`, `Bank transfer to ${company.bankAccount}, due within 3 calendar days.`, "Cash on delivery costs CZK 39 in Czechia or EUR 1.50 in Slovakia and is available only for supported Packeta services.", "Current shipping methods and prices are listed on the Shipping and Payment page and in checkout."] },
        { title: "5. Withdrawal and returns", paragraphs: ["Consumers may withdraw from an online contract within 14 days of receiving the goods unless a statutory exception applies. AMARÉE additionally offers a voluntary 30-day return for unworn, undamaged, clean and complete goods under the stated conditions."] },
        { title: "6. Defective goods", paragraphs: ["The seller is responsible for goods being free from defects upon receipt and matching the agreed characteristics. Consumers may exercise statutory rights for defects that appear within two years of receipt. Details are provided on the Returns, Exchanges and Complaints page."] },
        { title: "7. Dispute resolution", paragraphs: ["If a consumer dispute cannot be resolved directly, the consumer may contact the Czech Trade Inspection Authority, Central Inspectorate – ADR Department, Gorazdova 1969/24, 120 00 Prague 2, adr@coi.gov.cz, coi.gov.cz/informace-o-adr/."] },
        { title: "8. Final provisions", paragraphs: ["The contract is governed by Czech law without depriving consumers of mandatory protection applicable in their country of habitual residence. These terms are effective from 1 August 2026."] }
      ]
    },
    privacy: {
      title: "Privacy Policy",
      intro: "How AMARÉE handles the personal data of customers and store visitors.",
      sections: [
        { title: "1. Controller", paragraphs: [`The controller is ${addressEn}, Company ID ${company.companyId}. Privacy enquiries can be sent to ${company.email}. No data protection officer has been appointed.`] },
        { title: "2. Data we process", items: ["Identity, contact, delivery and billing details.", "Order, payment reference, shipping, pickup-point, return and complaint data.", "Customer-support communications and information needed to protect legal claims.", "Limited technical and security logs.", "Newsletter e-mail and consent or opt-out records.", "Optionally the day and month of birth when a customer requests a birthday reward. We do not store the birth year or full date of birth."] },
        { title: "3. Purposes and legal bases", items: ["Order, payment and delivery processing – contract performance or pre-contract steps.", "Accounting and statutory records – legal obligation.", "Returns, complaints, fraud prevention and legal claims – contract, legal obligation or legitimate interest.", "Newsletter to non-customers – consent.", "Offers for similar own products to existing customers – legitimate interest and electronic-marketing rules, always with an easy opt-out.", "Birthday reward – consent given by voluntarily entering the day and month of birth."] },
        { title: "4. Recipients", paragraphs: ["Data is shared only where necessary. Service providers include Cloudflare, Supabase, Active24/Websupport, Resend and, where a newsletter subscription is used, Ecomail. Depending on the selected delivery or payment method, necessary data is also shared with Packeta and GoPay, which may act as independent controllers for their own statutory duties. Data may also be disclosed to professional advisers and public authorities where required by law."] },
        { title: "5. Retention", items: ["Order and related customer data is normally retained for the performance of the contract and for 3 years afterwards to protect legal claims; longer while a dispute or complaint is pending.", "Accounting records are retained for the statutory period, normally 5 years from the end of the relevant accounting period, or longer where another rule applies.", "Complaint and return records are normally retained for 3 years after completion.", "Newsletter data is retained until consent is withdrawn or an objection is made; a minimal suppression record may remain so that the opt-out is respected.", "The day and month of birth are retained until the customer account is closed or consent is withdrawn.", "Security and operational logs are retained only for a proportionate security period, or longer where needed to resolve an incident."] },
        { title: "6. Your rights", items: ["Access and correction.", "Erasure or restriction where GDPR conditions apply.", "Data portability and objection to legitimate-interest processing.", "Withdrawal of consent at any time.", "A complaint to the Czech Office for Personal Data Protection, uoou.gov.cz."] },
        { title: "7. Security, cookies and marketing", paragraphs: ["We use proportionate security measures, access controls and encrypted transmission. Necessary technologies may support security, language and cart functions without consent; analytics and marketing technologies require the appropriate consent.", "Marketing messages must identify the sender and include a simple, free unsubscribe option."] }
      ]
    },
    returns: {
      title: "Returns, Exchanges and Complaints",
      intro: "A clear process for statutory withdrawal, AMARÉE's voluntary 30-day return and defective-goods complaints.",
      sections: [
        { title: "1. Contact us first", paragraphs: [`E-mail ${company.email} with the order number, product and requested process. For a complaint, describe the defect and attach photos where possible.`] },
        { title: "2. Return address", paragraphs: [`Pack the item securely and send it to ${addressEn}. Include the order number and contact details. Do not send cash on delivery; use tracked shipping and retain proof of dispatch.`] },
        { title: "3. Statutory 14-day withdrawal", paragraphs: ["Consumers may notify withdrawal within 14 days of receiving goods unless a statutory exception applies, then return the goods within a further 14 days. The customer bears direct return costs. Original packaging is recommended but is not automatically required for statutory withdrawal."] },
        { title: "4. Voluntary 30-day return", paragraphs: ["AMARÉE additionally accepts unworn, undamaged, clean and complete goods in their original packaging within 30 days of receipt. Customer-made or otherwise excluded goods do not qualify. Return shipping is paid by the customer."] },
        { title: "5. Refunds and exchanges", paragraphs: ["For statutory withdrawal, refunds including the least expensive standard outbound delivery are made within 14 days, normally by the original method. We may wait until the goods or proof of dispatch is received. Exchanges depend on stock and may be handled as a return followed by a new order."] },
        { title: "6. Complaints", paragraphs: ["State the order, item, defect, when it appeared and preferred remedy. We confirm receipt and the outcome. Complaints, including remedy, are handled without undue delay and within 30 calendar days unless a longer period is agreed.", "Depending on the statutory conditions, remedies may include repair, replacement, a reasonable discount or withdrawal. Normal wear, mechanical damage or demonstrable failure to follow care instructions is assessed individually and is not automatically a product defect."] }
      ]
    },
    shipping: {
      title: "Shipping and Payment",
      intro: "Prepared AMARÉE delivery methods, prices and payment options.",
      sections: [
        { title: "Czech delivery", items: ["Packeta pickup point or Z-BOX: CZK 95.", "Packeta home delivery: CZK 119.", "Free delivery from CZK 1,500 after discounts. A cash-on-delivery fee remains payable."] },
        { title: "Payment", items: ["GoPay: free; available online methods depend on merchant-account activation.", `Bank transfer: free, account ${company.bankAccount}, order number as payment reference, 3-calendar-day reservation.`, "Cash on delivery: CZK 39 in Czechia or EUR 1.50 in Slovakia, only for Packeta services verified as supported."] },
        { title: "Processing and delivery", paragraphs: ["The complete price is shown before checkout. Order receipt and dispatch are confirmed by e-mail. The exact dispatch estimate depends on stock and will be shown with the order."] },
        { title: "Delivery to Slovakia", items: ["Packeta pickup point or Z-BOX: EUR 8.50.", "Packeta home delivery: EUR 8.50.", "Cash-on-delivery fee: EUR 1.50, only for services verified as supported in the Packeta merchant account.", "Free shipping is not currently available for Slovakia."] },
        { title: "Damaged or delayed parcels", paragraphs: [`Contact ${company.email} with the order number and, where relevant, photos of the packaging. We will help coordinate the next steps with the carrier.`] }
      ]
    },
    care: {
      title: "Jewelry Care",
      intro: "Simple habits that help AMARÉE jewelry retain its appearance and shine.",
      notice: "The material and care instructions stated for the individual product always take priority.",
      sections: [
        { title: "1. Everyday care", paragraphs: ["Put jewelry on after perfume, creams and hair products, and remove it first when returning home. Wipe it gently with a dry, soft cloth after wearing."] },
        { title: "2. When to remove jewelry", items: ["Before showering, swimming, sauna or thermal and chlorinated water.", "Before sport, sleep, cleaning, gardening or manual work.", "When using chemicals or where chains, settings and clasps may catch or deform."] },
        { title: "3. Cleaning", paragraphs: ["Do not use abrasive pads, toothpaste or aggressive cleaners. Pearls, glued details and delicate stones should not be ultrasonically cleaned unless the product instructions explicitly allow it."] },
        { title: "4. Silver and natural oxidation", paragraphs: ["Silver may naturally oxidise due to air, perspiration, cosmetics or skin pH. Light tarnish can usually be removed gently with a cloth intended for silver.", "Do not use abrasive pastes or intensive polishing on gold-plated silver. Use liquid cleaners only when they are suitable for the stones, decorations and finish of the specific piece."] },
        { title: "5. Storage", paragraphs: ["Store jewelry dry, away from direct sunlight and separately in a box or soft pouch. Fasten chains before storage and keep jewelry away from keys and coins."] },
        { title: "6. Need advice?", paragraphs: [`Contact ${company.email} if you are unsure how to care for a specific piece. Stop wearing a piece with a loose clasp, stone or setting until it is checked.`] }
      ]
    }
  },
  de: {
    terms: {
      title: "Geschäftsbedingungen",
      intro: "Regeln für Einkäufe im AMARÉE-Onlineshop, betrieben von MEDIANUM s.r.o.",
      sections: [
        { title: "1. Shopbetreiber", paragraphs: [`Verkäufer und Betreiber ist ${addressDe}, Unternehmens-ID ${company.companyId}, eingetragen bei ${company.registerEntry}. Das Unternehmen ist nicht mehrwertsteuerpflichtig. Kontakt: ${company.email}, ${company.phone}.`] },
        { title: "2. Produkte und Preise", paragraphs: ["Jede Produktseite nennt die wesentlichen Eigenschaften, Material, Maße, Preis und Verfügbarkeit. Preise für den tschechischen Markt werden in CZK angegeben. Versand und Nachnahmegebühr werden vor dem Absenden der Bestellung angezeigt."] },
        { title: "3. Bestellung und Vertrag", paragraphs: ["Kundinnen und Kunden können ihre Angaben vor dem Absenden über eine Schaltfläche mit eindeutigem Hinweis auf die Zahlungspflicht prüfen und korrigieren. Die Bestellung ist ein Angebot; der Kaufvertrag entsteht mit der ausdrücklichen Annahme durch den Verkäufer.", "Eine Bestätigung wird per E-Mail versandt. Vor Annahme kann eine Bestellung insbesondere bei fehlendem Bestand, offensichtlichem Preisfehler oder Missbrauch abgelehnt werden."] },
        { title: "4. Zahlung und Lieferung", items: ["Online-Zahlung über GoPay mit den für das Händlerkonto aktivierten Methoden.", `Banküberweisung auf ${company.bankAccount}, fällig innerhalb von 3 Kalendertagen.`, "Nachnahme kostet 39 CZK in Tschechien oder 1,50 EUR in der Slowakei und ist nur für unterstützte Packeta-Dienste verfügbar.", "Aktuelle Versandarten und Preise stehen auf der Seite Versand und Zahlung und im Checkout."] },
        { title: "5. Widerruf und Rückgabe", paragraphs: ["Verbraucher können einen Online-Vertrag innerhalb von 14 Tagen nach Erhalt widerrufen, sofern keine gesetzliche Ausnahme gilt. AMARÉE bietet zusätzlich eine freiwillige 30-tägige Rückgabe für ungetragene, unbeschädigte, saubere und vollständige Ware zu den genannten Bedingungen."] },
        { title: "6. Mangelhafte Ware", paragraphs: ["Der Verkäufer haftet dafür, dass die Ware bei Übergabe mangelfrei ist und den vereinbarten Eigenschaften entspricht. Gesetzliche Rechte können bei Mängeln geltend gemacht werden, die sich innerhalb von zwei Jahren zeigen. Details stehen unter Umtausch, Rückgabe und Reklamation."] },
        { title: "7. Streitbeilegung", paragraphs: ["Kann ein Verbraucherstreit nicht direkt gelöst werden, ist die Tschechische Handelsinspektion zuständig: Zentralinspektorat – ADR-Abteilung, Gorazdova 1969/24, 120 00 Prag 2, adr@coi.gov.cz, coi.gov.cz/informace-o-adr/."] },
        { title: "8. Schlussbestimmungen", paragraphs: ["Es gilt tschechisches Recht, ohne Verbraucher um zwingenden Schutz ihres gewöhnlichen Aufenthaltsstaats zu bringen. Diese Bedingungen gelten ab dem 1. August 2026."] }
      ]
    },
    privacy: {
      title: "Datenschutz",
      intro: "Wie AMARÉE personenbezogene Daten von Kundinnen, Kunden und Shopbesuchern verarbeitet.",
      sections: [
        { title: "1. Verantwortlicher", paragraphs: [`Verantwortlicher ist ${addressDe}, Unternehmens-ID ${company.companyId}. Datenschutzanfragen richten Sie an ${company.email}. Ein Datenschutzbeauftragter wurde nicht bestellt.`] },
        { title: "2. Verarbeitete Daten", items: ["Identitäts-, Kontakt-, Liefer- und Rechnungsdaten.", "Bestell-, Zahlungsreferenz-, Versand-, Abholstellen-, Rückgabe- und Reklamationsdaten.", "Kundenkommunikation und Daten zum Schutz rechtlicher Ansprüche.", "Begrenzte technische und Sicherheitsprotokolle.", "Newsletter-E-Mail sowie Einwilligungs- und Widerspruchsnachweise.", "Optional Tag und Monat der Geburt, wenn eine Kundin oder ein Kunde die Geburtstagsprämie nutzen möchte. Geburtsjahr und vollständiges Geburtsdatum werden nicht gespeichert."] },
        { title: "3. Zwecke und Rechtsgrundlagen", items: ["Bestellung, Zahlung und Lieferung – Vertragserfüllung oder vorvertragliche Schritte.", "Buchhaltung und gesetzliche Aufzeichnungen – rechtliche Verpflichtung.", "Rückgaben, Reklamationen, Missbrauchsprävention und Ansprüche – Vertrag, Rechtspflicht oder berechtigtes Interesse.", "Newsletter an Nichtkunden – Einwilligung.", "Angebote ähnlicher eigener Produkte an Bestandskunden – berechtigtes Interesse und Regeln für elektronisches Marketing mit einfacher Abmeldung.", "Geburtstagsprämie – Einwilligung durch freiwillige Angabe von Tag und Monat der Geburt."] },
        { title: "4. Empfänger", paragraphs: ["Daten werden nur soweit erforderlich weitergegeben. Zu den Dienstleistern gehören Cloudflare, Supabase, Active24/Websupport, Resend und bei einer Newsletter-Anmeldung Ecomail. Je nach gewählter Versand- oder Zahlungsart werden erforderliche Daten auch an Packeta und GoPay übermittelt; diese können für eigene gesetzliche Pflichten als selbstständige Verantwortliche handeln. Soweit gesetzlich erforderlich, können auch Berater und Behörden Daten erhalten."] },
        { title: "5. Aufbewahrung", items: ["Bestell- und zugehörige Kundendaten werden für die Vertragsabwicklung und danach in der Regel 3 Jahre zum Schutz rechtlicher Ansprüche aufbewahrt; bei laufenden Streitigkeiten oder Reklamationen entsprechend länger.", "Buchhaltungsunterlagen werden für die gesetzliche Frist, in der Regel 5 Jahre ab Ende des betreffenden Geschäftsjahres, oder bei einer längeren gesetzlichen Frist entsprechend länger aufbewahrt.", "Reklamations- und Rückgabedaten werden in der Regel 3 Jahre nach Abschluss aufbewahrt.", "Newsletter-Daten werden bis zum Widerruf der Einwilligung oder Widerspruch gespeichert; ein minimaler Sperrvermerk kann bestehen bleiben, damit die Abmeldung beachtet wird.", "Tag und Monat der Geburt werden bis zur Schließung des Kundenkontos oder bis zum Widerruf der Einwilligung gespeichert.", "Sicherheits- und Betriebsprotokolle werden nur für einen angemessenen Sicherheitszeitraum oder zur Klärung eines Vorfalls länger gespeichert."] },
        { title: "6. Ihre Rechte", items: ["Auskunft und Berichtigung.", "Löschung oder Einschränkung bei Vorliegen der GDPR-Voraussetzungen.", "Datenübertragbarkeit und Widerspruch gegen Verarbeitung auf Grundlage berechtigter Interessen.", "Jederzeitiger Widerruf einer Einwilligung.", "Beschwerde beim tschechischen Amt für den Schutz personenbezogener Daten, uoou.gov.cz."] },
        { title: "7. Sicherheit, Cookies und Marketing", paragraphs: ["Wir verwenden angemessene Sicherheitsmaßnahmen, Zugriffskontrollen und verschlüsselte Übertragung. Notwendige Technologien können Sicherheit, Sprache und Warenkorb ohne Einwilligung unterstützen; Analyse und Marketing erfordern eine entsprechende Einwilligung.", "Werbenachrichten müssen den Absender nennen und eine einfache kostenlose Abmeldung enthalten."] }
      ]
    },
    returns: {
      title: "Umtausch, Rückgabe und Reklamation",
      intro: "Der Ablauf für gesetzlichen Widerruf, freiwillige 30-Tage-Rückgabe und Mängelreklamation.",
      sections: [
        { title: "1. Zuerst Kontakt aufnehmen", paragraphs: [`Schreiben Sie an ${company.email} und nennen Sie Bestellnummer, Produkt und gewünschten Vorgang. Bei einer Reklamation beschreiben Sie den Mangel und fügen nach Möglichkeit Fotos bei.`] },
        { title: "2. Rücksendeadresse", paragraphs: [`Sicher verpackt an ${addressDe} senden und Bestellnummer sowie Kontaktdaten beilegen. Nicht per Nachnahme versenden; nutzen Sie eine nachverfolgbare Versandart und bewahren Sie den Beleg auf.`] },
        { title: "3. Gesetzlicher 14-Tage-Widerruf", paragraphs: ["Verbraucher können den Widerruf innerhalb von 14 Tagen nach Erhalt erklären, sofern keine gesetzliche Ausnahme gilt, und die Ware innerhalb weiterer 14 Tage zurücksenden. Direkte Rücksendekosten trägt der Kunde. Originalverpackung wird empfohlen, ist beim gesetzlichen Widerruf aber nicht automatisch Voraussetzung."] },
        { title: "4. Freiwillige 30-Tage-Rückgabe", paragraphs: ["AMARÉE akzeptiert zusätzlich innerhalb von 30 Tagen ungetragene, unbeschädigte, saubere und vollständige Ware in Originalverpackung. Kundenspezifische oder anderweitig ausgeschlossene Ware ist ausgenommen. Rücksendekosten trägt der Kunde."] },
        { title: "5. Erstattung und Umtausch", paragraphs: ["Beim gesetzlichen Widerruf erfolgt die Erstattung einschließlich der günstigsten Standard-Hinsendekosten innerhalb von 14 Tagen, in der Regel über die ursprüngliche Zahlungsart. Wir dürfen bis zum Erhalt der Ware oder des Versandnachweises warten. Umtausch hängt vom Bestand ab und kann als Rückgabe mit neuer Bestellung abgewickelt werden."] },
        { title: "6. Reklamationen", paragraphs: ["Nennen Sie Bestellung, Produkt, Mangel, Zeitpunkt des Auftretens und gewünschte Abhilfe. Eingang und Ergebnis werden bestätigt. Reklamationen einschließlich Abhilfe werden unverzüglich und spätestens innerhalb von 30 Kalendertagen erledigt, sofern keine längere Frist vereinbart wird.", "Je nach gesetzlichen Voraussetzungen kommen Reparatur, Ersatz, angemessene Minderung oder Vertragsrücktritt in Betracht. Normaler Verschleiß, mechanische Beschädigung oder nachweisliche Missachtung der Pflegehinweise werden individuell geprüft und sind nicht automatisch Produktmängel."] }
      ]
    },
    shipping: {
      title: "Versand und Zahlung",
      intro: "Vorbereitete AMARÉE-Versandarten, Preise und Zahlungsoptionen.",
      sections: [
        { title: "Versand in Tschechien", items: ["Packeta Abholstelle oder Z-BOX: 95 CZK.", "Packeta Hauszustellung: 119 CZK.", "Kostenloser Versand ab 1.500 CZK Warenwert nach Rabatt. Eine Nachnahmegebühr bleibt zahlbar."] },
        { title: "Zahlung", items: ["GoPay: kostenlos; verfügbare Online-Methoden hängen von der Händlerkonto-Aktivierung ab.", `Banküberweisung: kostenlos, Konto ${company.bankAccount}, Bestellnummer als Verwendungszweck, Reservierung 3 Kalendertage.`, "Nachnahme: 39 CZK in Tschechien oder 1,50 EUR in der Slowakei, nur für bestätigte Packeta-Dienste."] },
        { title: "Bearbeitung und Versand", paragraphs: ["Der Gesamtpreis wird vor dem Absenden angezeigt. Bestelleingang und Versand werden per E-Mail bestätigt. Der konkrete Versandtermin hängt vom Bestand ab."] },
        { title: "Versand in die Slowakei", items: ["Packeta Abholstelle oder Z-BOX: 8,50 EUR.", "Packeta Hauszustellung: 8,50 EUR.", "Nachnahmegebühr: 1,50 EUR, nur für im Packeta-Händlerkonto bestätigte Dienste.", "Kostenloser Versand ist für die Slowakei derzeit nicht verfügbar."] },
        { title: "Beschädigte oder verspätete Sendung", paragraphs: [`Kontaktieren Sie ${company.email} mit Bestellnummer und gegebenenfalls Fotos der Verpackung. Wir unterstützen die Abstimmung mit dem Transportdienst.`] }
      ]
    },
    care: {
      title: "Schmuckpflege",
      intro: "Einfache Gewohnheiten, damit AMARÉE-Schmuck Aussehen und Glanz länger behält.",
      notice: "Material und Pflegehinweise des jeweiligen Produkts haben immer Vorrang.",
      sections: [
        { title: "1. Alltagspflege", paragraphs: ["Schmuck erst nach Parfum, Creme und Haarprodukten anlegen und zu Hause zuerst abnehmen. Nach dem Tragen sanft mit einem trockenen weichen Tuch abwischen."] },
        { title: "2. Wann Schmuck ablegen", items: ["Vor Duschen, Schwimmen, Sauna sowie Thermal- und Chlorwasser.", "Vor Sport, Schlafen, Putzen, Garten- und Handarbeit.", "Bei Chemikalien oder wenn Ketten, Fassungen und Verschlüsse hängen bleiben oder sich verformen könnten."] },
        { title: "3. Reinigung", paragraphs: ["Keine Scheuermittel, Zahnpasta oder aggressiven Reiniger verwenden. Perlen, geklebte Details und empfindliche Steine nur dann im Ultraschall reinigen, wenn die Produktanleitung dies ausdrücklich erlaubt."] },
        { title: "4. Silber und natürliche Oxidation", paragraphs: ["Silber kann durch Luft, Schweiß, Kosmetik oder den pH-Wert der Haut natürlich oxidieren. Leichte Verfärbungen lassen sich meist vorsichtig mit einem geeigneten Silberpflegetuch entfernen.", "Bei vergoldetem Silber keine Scheuerpasten oder intensives Polieren verwenden. Flüssigreiniger nur einsetzen, wenn sie für Steine, Dekorelemente und die konkrete Oberfläche geeignet sind."] },
        { title: "5. Aufbewahrung", paragraphs: ["Schmuck trocken, vor direktem Sonnenlicht geschützt und getrennt in einer Box oder einem weichen Beutel aufbewahren. Ketten schließen und von Schlüsseln und Münzen fernhalten."] },
        { title: "6. Beratung", paragraphs: [`Bei Fragen zur Pflege eines bestimmten Schmuckstücks schreiben Sie an ${company.email}. Schmuck mit lockerem Verschluss, Stein oder Fassung bis zur Prüfung nicht weiter tragen.`] }
      ]
    }
  }
};
