import type { Locale } from "@/i18n/routing";
import { localizedPaths } from "@/i18n/routing";
import { company } from "@/lib/config/company";

export type LegalPageKey = "terms" | "privacy" | "returns" | "shipping" | "care";
export type LegalSection = { title: string; paragraphs?: string[]; items?: string[] };
export type LegalPageContent = { title: string; intro: string; notice: string; sections: LegalSection[] };

const addressCs = `${company.legalName}, ${company.address.street}, ${company.address.district}, ${company.address.postalCode} ${company.address.city}, ${company.address.country}`;
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
      notice: "Pracovní znění k finální kontrole českým právníkem před zahájením prodeje.",
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
            "Dobírka za 39 Kč je dostupná pro podporované české metody Packeta. U osobního odběru a zahraničního doručení se dobírka nenabízí."
          ]
        },
        {
          title: "5. Doprava a převzetí",
          paragraphs: [
            "Aktuální dopravní metody, ceny a podmínky jsou uvedeny na stránce Doprava a platba a vždy také v objednávce. Zboží je doručeno na zadanou adresu, vybrané výdejní místo nebo Z-BOX, případně připraveno k osobnímu odběru po předchozím potvrzení.",
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
            "Změny podmínek se nedotýkají práv a povinností vzniklých za účinnosti předchozího znění. Datum účinnosti bude doplněno po finální právní kontrole a před spuštěním prodeje."
          ]
        }
      ]
    },
    privacy: {
      title: "Ochrana osobních údajů",
      intro: "Přehled toho, jak AMARÉE pracuje s osobními údaji zákazníků a návštěvníků e-shopu.",
      notice: "Pracovní znění; před spuštěním je nutné dokončit audit zpracovatelů, cookies a retenčních lhůt.",
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
            "E-mail a záznam o souhlasu nebo odmítnutí, pokud se zákazník přihlásí k newsletteru."
          ]
        },
        {
          title: "3. Účely a právní základy",
          items: [
            "Vyřízení objednávky, platby, dopravy a komunikace před uzavřením smlouvy a při jejím plnění – plnění smlouvy nebo kroky před jejím uzavřením.",
            "Účetní, daňové a další zákonné evidence – plnění právní povinnosti.",
            "Reklamace, vratky, prevence zneužití a ochrana právních nároků – plnění smlouvy, právní povinnost nebo oprávněný zájem.",
            "Newsletter pro osoby, které nejsou zákazníky – souhlas, který lze kdykoli odvolat.",
            "Nabídky vlastních obdobných výrobků stávajícím zákazníkům – oprávněný zájem a pravidla elektronického marketingu, vždy s jednoduchou možností odmítnutí."
          ]
        },
        {
          title: "4. Komu mohou být údaje předány",
          paragraphs: [
            "Údaje předáváme jen v rozsahu nezbytném pro daný účel. Předpokládanými příjemci jsou poskytovatel hostingu, databázová a úložná služba Supabase, Packeta, GoPay, budoucí e-mailová služba Ecomail, účetní a právní poradci a orgány veřejné moci, pokud to vyžaduje zákon.",
            "Před produkčním spuštěním bude zveřejněný seznam upraven podle skutečně uzavřených smluv, umístění zpracování a případných přenosů mimo Evropský hospodářský prostor."
          ]
        },
        {
          title: "5. Jak dlouho údaje uchováváme",
          paragraphs: [
            "Údaje uchováváme pouze po dobu potřebnou pro daný účel. Objednávkové a reklamační údaje po dobu plnění smlouvy, běhu zákonných lhůt a ochrany právních nároků; účetní doklady po dobu stanovenou právními předpisy; marketingové údaje do odvolání souhlasu nebo vznesení námitky; technické logy po přiměřenou dobu nutnou pro zabezpečení.",
            "Přesný retenční plán bude doplněn po produkčním auditu systémů a právní kontrole."
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
            "Nezbytné cookies nebo obdobné úložiště mohou být použity pro bezpečnost, jazyk a fungování košíku bez souhlasu. Analytické a marketingové technologie budou aktivovány pouze po odpovídajícím souhlasu. Jejich přesný seznam bude doplněn po produkčním auditu.",
            "Každý newsletter musí být označen jako obchodní sdělení, uvádět odesílatele a obsahovat jednoduché bezplatné odhlášení."
          ]
        }
      ]
    },
    returns: {
      title: "Výměna, vrácení a reklamace",
      intro: "Srozumitelný postup pro zákonné odstoupení, dobrovolné 30denní vrácení i reklamaci šperku.",
      notice: "Pracovní zákaznické znění k finální právní kontrole; online formuláře zatím nejsou aktivní.",
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
        }
      ]
    },
    shipping: {
      title: "Doprava a platba",
      intro: "Přehled připravených způsobů doručení, cen a platebních možností AMARÉE.",
      notice: "Ceny jsou potvrzené; ostré služby GoPay a Packeta čekají na aktivaci a produkční ověření účtů.",
      sections: [
        {
          title: "Doprava po České republice",
          items: [
            "Packeta – výdejní místo nebo Z-BOX: 95 Kč.",
            "Packeta – doručení na adresu: 119 Kč.",
            `Osobní odběr na adrese ${company.address.street}, ${company.address.city}: zdarma a pouze po potvrzení, že je objednávka připravena.`,
            "Doprava je zdarma při hodnotě zboží po slevě od 1 500 Kč. Případný poplatek za dobírku se účtuje i při dopravě zdarma."
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
            "Dobírka: 39 Kč a pouze pro české doručení Packeta na adresu nebo výdejní místo / Z-BOX.",
            "Osobní odběr lze uhradit přes GoPay nebo předem bankovním převodem; hotovost ani dobírka se nenabízí."
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
          title: "Osobní odběr",
          paragraphs: [
            `Objednávku lze vyzvednout na adrese ${company.address.street}, ${company.address.district}, ${company.address.postalCode} ${company.address.city}. Nejde o prodejnu s pravidelnou otevírací dobou. K vyzvednutí přijďte až po e-mailovém nebo telefonickém potvrzení termínu.`
          ]
        },
        {
          title: "Doručení do dalších zemí EU",
          paragraphs: [
            "Připravená jednotná sazba je 14,50 EUR bez dopravy zdarma a bez dobírky. Zahraniční objednávky jsou zatím deaktivované, dokud nebudou potvrzeny podporované země, EUR ceny produktů, dopravní služby a produkční platby."
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
          title: "4. Nerezová ocel a povrchové úpravy",
          paragraphs: [
            "Nerezová ocel je odolná, ale není nezničitelná. Kontakt s chlorem, solí, kosmetikou a tvrdými povrchy může způsobit zmatnění nebo poškrábání.",
            "U pozlacených a jinak povrchově upravených šperků se může vrstva nošením postupně zeslabovat. Životnost prodlouží šetrné zacházení, omezení vody a chemie a samostatné ukládání."
          ]
        },
        {
          title: "5. Stříbro a přirozená oxidace",
          paragraphs: [
            "Pokud je šperk vyroben ze stříbra, může jeho povrch přirozeně oxidovat a tmavnout vlivem vzduchu, potu, kosmetiky nebo pH pokožky. Samotné tmavnutí nemusí znamenat vadu materiálu a lze je často odstranit vhodným hadříkem na stříbro.",
            "Nepoužívejte metodu čištění určenou pro stříbro na perly, pozlacené povrchy nebo citlivé kameny bez ověření pokynů výrobku."
          ]
        },
        {
          title: "6. Ukládání",
          paragraphs: [
            "Šperky ukládejte suché, mimo přímé slunce a odděleně od sebe do krabičky nebo měkkého sáčku. Řetízky zapněte a položte tak, aby se nezauzlovaly. Šperky nenoste volně v kabelce nebo peněžence společně s mincemi a klíči."
          ]
        },
        {
          title: "7. Kdy se na nás obrátit",
          paragraphs: [
            `Nejste-li si jistí materiálem nebo správným čištěním konkrétního šperku, napište na ${company.email}. Při uvolněném zapínání, kamínku nebo jiné změně šperk dál nenoste, aby se poškození nezvětšilo.`
          ]
        }
      ]
    }
  },
  en: {
    terms: {
      title: "Terms and Conditions",
      intro: "Rules for purchases from the AMARÉE online store operated by MEDIANUM s.r.o.",
      notice: "Working translation. Final Czech legal review is required before sales begin.",
      sections: [
        { title: "1. Store operator", paragraphs: [`The seller and operator is ${addressEn}, Company ID ${company.companyId}, registered with ${company.registerEntry}. The company is not VAT registered. Contact: ${company.email}, ${company.phone}.`] },
        { title: "2. Products and prices", paragraphs: ["Each product page states the main characteristics, material, dimensions, price and availability. Czech-market prices are shown in CZK. Shipping and any cash-on-delivery fee are displayed before the order is submitted."] },
        { title: "3. Order and contract", paragraphs: ["Customers review and correct their order before submitting it through a button that clearly states the obligation to pay. The order is an offer to conclude a purchase contract; the contract is concluded when the seller sends an explicit acceptance.", "An order confirmation is sent by e-mail. The seller may reject an order before acceptance if stock is unavailable, the price contains an obvious error or the store is being misused."] },
        { title: "4. Payment and delivery", items: [`GoPay online payment using methods enabled for the merchant account.`, `Bank transfer to ${company.bankAccount}, due within 3 calendar days.`, "Cash on delivery for supported Czech Packeta services, with a CZK 39 fee.", "Current shipping methods and prices are listed on the Shipping and Payment page and in checkout."] },
        { title: "5. Withdrawal and returns", paragraphs: ["Consumers may withdraw from an online contract within 14 days of receiving the goods unless a statutory exception applies. AMARÉE additionally offers a voluntary 30-day return for unworn, undamaged, clean and complete goods under the stated conditions."] },
        { title: "6. Defective goods", paragraphs: ["The seller is responsible for goods being free from defects upon receipt and matching the agreed characteristics. Consumers may exercise statutory rights for defects that appear within two years of receipt. Details are provided on the Returns, Exchanges and Complaints page."] },
        { title: "7. Dispute resolution", paragraphs: ["If a consumer dispute cannot be resolved directly, the consumer may contact the Czech Trade Inspection Authority, Central Inspectorate – ADR Department, Gorazdova 1969/24, 120 00 Prague 2, adr@coi.gov.cz, coi.gov.cz/informace-o-adr/."] },
        { title: "8. Final provisions", paragraphs: ["The contract is governed by Czech law without depriving consumers of mandatory protection applicable in their country of habitual residence. The effective date will be added after final legal review."] }
      ]
    },
    privacy: {
      title: "Privacy Policy",
      intro: "How AMARÉE handles the personal data of customers and store visitors.",
      notice: "Working translation. Processors, cookies and retention periods require a final production audit.",
      sections: [
        { title: "1. Controller", paragraphs: [`The controller is ${addressEn}, Company ID ${company.companyId}. Privacy enquiries can be sent to ${company.email}. No data protection officer has been appointed.`] },
        { title: "2. Data we process", items: ["Identity, contact, delivery and billing details.", "Order, payment reference, shipping, pickup-point, return and complaint data.", "Customer-support communications and information needed to protect legal claims.", "Limited technical and security logs.", "Newsletter e-mail and consent or opt-out records."] },
        { title: "3. Purposes and legal bases", items: ["Order, payment and delivery processing – contract performance or pre-contract steps.", "Accounting and statutory records – legal obligation.", "Returns, complaints, fraud prevention and legal claims – contract, legal obligation or legitimate interest.", "Newsletter to non-customers – consent.", "Offers for similar own products to existing customers – legitimate interest and electronic-marketing rules, always with an easy opt-out."] },
        { title: "4. Recipients", paragraphs: ["Data is shared only where necessary. Expected recipients include hosting, Supabase, Packeta, GoPay, the future Ecomail service, accounting and legal advisers, and public authorities where required by law. The list will be finalised against actual production contracts and locations."] },
        { title: "5. Retention", paragraphs: ["Data is retained only as long as required for its purpose: for contract performance and statutory claim periods, mandatory accounting periods, until marketing consent is withdrawn or an objection is raised, and for a limited security-log period. A precise schedule will follow the production audit."] },
        { title: "6. Your rights", items: ["Access and correction.", "Erasure or restriction where GDPR conditions apply.", "Data portability and objection to legitimate-interest processing.", "Withdrawal of consent at any time.", "A complaint to the Czech Office for Personal Data Protection, uoou.gov.cz."] },
        { title: "7. Security, cookies and marketing", paragraphs: ["We use proportionate security measures, access controls and encrypted transmission. Necessary technologies may support security, language and cart functions without consent; analytics and marketing technologies require the appropriate consent.", "Marketing messages must identify the sender and include a simple, free unsubscribe option."] }
      ]
    },
    returns: {
      title: "Returns, Exchanges and Complaints",
      intro: "A clear process for statutory withdrawal, AMARÉE's voluntary 30-day return and defective-goods complaints.",
      notice: "Working translation. Online forms are not active yet.",
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
      notice: "Prices are confirmed; live GoPay and Packeta services still require production-account activation and verification.",
      sections: [
        { title: "Czech delivery", items: ["Packeta pickup point or Z-BOX: CZK 95.", "Packeta home delivery: CZK 119.", `Personal pickup at ${company.address.street}, ${company.address.city}: free, after a collection confirmation.`, "Free delivery from CZK 1,500 after discounts. A cash-on-delivery fee remains payable."] },
        { title: "Payment", items: ["GoPay: free; available online methods depend on merchant-account activation.", `Bank transfer: free, account ${company.bankAccount}, order number as payment reference, 3-calendar-day reservation.`, "Cash on delivery: CZK 39 for supported Czech Packeta delivery.", "Personal pickup supports GoPay or advance bank transfer, not cash on delivery."] },
        { title: "Processing and collection", paragraphs: ["The complete price is shown before checkout. Order receipt and dispatch are confirmed by e-mail. The exact dispatch estimate depends on stock and will be shown with the order.", `Personal pickup at ${company.address.street}, ${company.address.district} is not a shop with regular opening hours. Visit only after a confirmed collection time.`] },
        { title: "Other EU countries", paragraphs: ["A EUR 14.50 delivery rate is prepared without free shipping or cash on delivery. International checkout remains disabled until countries, services, EUR product prices and live payments are confirmed."] },
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
        { title: "4. Materials and finishes", paragraphs: ["Stainless steel is durable but can still scratch or become dull. Gold-plated and other surface finishes naturally wear over time; limiting water, cosmetics and friction helps them last longer.", "Silver may naturally oxidise due to air, perspiration or skin pH. Use silver-specific care only where suitable and never apply it blindly to pearls, plated finishes or delicate stones."] },
        { title: "5. Storage", paragraphs: ["Store jewelry dry, away from direct sunlight and separately in a box or soft pouch. Fasten chains before storage and keep jewelry away from keys and coins."] },
        { title: "6. Need advice?", paragraphs: [`Contact ${company.email} if you are unsure how to care for a specific piece. Stop wearing a piece with a loose clasp, stone or setting until it is checked.`] }
      ]
    }
  },
  de: {
    terms: {
      title: "Geschäftsbedingungen",
      intro: "Regeln für Einkäufe im AMARÉE-Onlineshop, betrieben von MEDIANUM s.r.o.",
      notice: "Arbeitsübersetzung. Vor Verkaufsstart ist eine abschließende tschechische Rechtsprüfung erforderlich.",
      sections: [
        { title: "1. Shopbetreiber", paragraphs: [`Verkäufer und Betreiber ist ${addressDe}, Unternehmens-ID ${company.companyId}, eingetragen bei ${company.registerEntry}. Das Unternehmen ist nicht mehrwertsteuerpflichtig. Kontakt: ${company.email}, ${company.phone}.`] },
        { title: "2. Produkte und Preise", paragraphs: ["Jede Produktseite nennt die wesentlichen Eigenschaften, Material, Maße, Preis und Verfügbarkeit. Preise für den tschechischen Markt werden in CZK angegeben. Versand und Nachnahmegebühr werden vor dem Absenden der Bestellung angezeigt."] },
        { title: "3. Bestellung und Vertrag", paragraphs: ["Kundinnen und Kunden können ihre Angaben vor dem Absenden über eine Schaltfläche mit eindeutigem Hinweis auf die Zahlungspflicht prüfen und korrigieren. Die Bestellung ist ein Angebot; der Kaufvertrag entsteht mit der ausdrücklichen Annahme durch den Verkäufer.", "Eine Bestätigung wird per E-Mail versandt. Vor Annahme kann eine Bestellung insbesondere bei fehlendem Bestand, offensichtlichem Preisfehler oder Missbrauch abgelehnt werden."] },
        { title: "4. Zahlung und Lieferung", items: ["Online-Zahlung über GoPay mit den für das Händlerkonto aktivierten Methoden.", `Banküberweisung auf ${company.bankAccount}, fällig innerhalb von 3 Kalendertagen.`, "Nachnahme für unterstützte tschechische Packeta-Dienste, Gebühr 39 CZK.", "Aktuelle Versandarten und Preise stehen auf der Seite Versand und Zahlung und im Checkout."] },
        { title: "5. Widerruf und Rückgabe", paragraphs: ["Verbraucher können einen Online-Vertrag innerhalb von 14 Tagen nach Erhalt widerrufen, sofern keine gesetzliche Ausnahme gilt. AMARÉE bietet zusätzlich eine freiwillige 30-tägige Rückgabe für ungetragene, unbeschädigte, saubere und vollständige Ware zu den genannten Bedingungen."] },
        { title: "6. Mangelhafte Ware", paragraphs: ["Der Verkäufer haftet dafür, dass die Ware bei Übergabe mangelfrei ist und den vereinbarten Eigenschaften entspricht. Gesetzliche Rechte können bei Mängeln geltend gemacht werden, die sich innerhalb von zwei Jahren zeigen. Details stehen unter Umtausch, Rückgabe und Reklamation."] },
        { title: "7. Streitbeilegung", paragraphs: ["Kann ein Verbraucherstreit nicht direkt gelöst werden, ist die Tschechische Handelsinspektion zuständig: Zentralinspektorat – ADR-Abteilung, Gorazdova 1969/24, 120 00 Prag 2, adr@coi.gov.cz, coi.gov.cz/informace-o-adr/."] },
        { title: "8. Schlussbestimmungen", paragraphs: ["Es gilt tschechisches Recht, ohne Verbraucher um zwingenden Schutz ihres gewöhnlichen Aufenthaltsstaats zu bringen. Das Wirksamkeitsdatum wird nach der Rechtsprüfung ergänzt."] }
      ]
    },
    privacy: {
      title: "Datenschutz",
      intro: "Wie AMARÉE personenbezogene Daten von Kundinnen, Kunden und Shopbesuchern verarbeitet.",
      notice: "Arbeitsübersetzung. Auftragsverarbeiter, Cookies und Aufbewahrungsfristen benötigen ein abschließendes Produktionsaudit.",
      sections: [
        { title: "1. Verantwortlicher", paragraphs: [`Verantwortlicher ist ${addressDe}, Unternehmens-ID ${company.companyId}. Datenschutzanfragen richten Sie an ${company.email}. Ein Datenschutzbeauftragter wurde nicht bestellt.`] },
        { title: "2. Verarbeitete Daten", items: ["Identitäts-, Kontakt-, Liefer- und Rechnungsdaten.", "Bestell-, Zahlungsreferenz-, Versand-, Abholstellen-, Rückgabe- und Reklamationsdaten.", "Kundenkommunikation und Daten zum Schutz rechtlicher Ansprüche.", "Begrenzte technische und Sicherheitsprotokolle.", "Newsletter-E-Mail sowie Einwilligungs- und Widerspruchsnachweise."] },
        { title: "3. Zwecke und Rechtsgrundlagen", items: ["Bestellung, Zahlung und Lieferung – Vertragserfüllung oder vorvertragliche Schritte.", "Buchhaltung und gesetzliche Aufzeichnungen – rechtliche Verpflichtung.", "Rückgaben, Reklamationen, Missbrauchsprävention und Ansprüche – Vertrag, Rechtspflicht oder berechtigtes Interesse.", "Newsletter an Nichtkunden – Einwilligung.", "Angebote ähnlicher eigener Produkte an Bestandskunden – berechtigtes Interesse und Regeln für elektronisches Marketing mit einfacher Abmeldung."] },
        { title: "4. Empfänger", paragraphs: ["Daten werden nur soweit erforderlich weitergegeben. Erwartete Empfänger sind Hosting, Supabase, Packeta, GoPay, der künftige Ecomail-Dienst, Buchhaltungs- und Rechtsberater sowie Behörden. Die Liste wird anhand der tatsächlichen Produktionsverträge und Standorte finalisiert."] },
        { title: "5. Aufbewahrung", paragraphs: ["Daten werden nur zweckgebunden aufbewahrt: für Vertragsabwicklung und gesetzliche Anspruchsfristen, vorgeschriebene Buchhaltungsfristen, bis zum Widerruf bzw. Widerspruch beim Marketing und für begrenzte Sicherheitsprotokollzeiten. Ein genauer Plan folgt nach dem Produktionsaudit."] },
        { title: "6. Ihre Rechte", items: ["Auskunft und Berichtigung.", "Löschung oder Einschränkung bei Vorliegen der GDPR-Voraussetzungen.", "Datenübertragbarkeit und Widerspruch gegen Verarbeitung auf Grundlage berechtigter Interessen.", "Jederzeitiger Widerruf einer Einwilligung.", "Beschwerde beim tschechischen Amt für den Schutz personenbezogener Daten, uoou.gov.cz."] },
        { title: "7. Sicherheit, Cookies und Marketing", paragraphs: ["Wir verwenden angemessene Sicherheitsmaßnahmen, Zugriffskontrollen und verschlüsselte Übertragung. Notwendige Technologien können Sicherheit, Sprache und Warenkorb ohne Einwilligung unterstützen; Analyse und Marketing erfordern eine entsprechende Einwilligung.", "Werbenachrichten müssen den Absender nennen und eine einfache kostenlose Abmeldung enthalten."] }
      ]
    },
    returns: {
      title: "Umtausch, Rückgabe und Reklamation",
      intro: "Der Ablauf für gesetzlichen Widerruf, freiwillige 30-Tage-Rückgabe und Mängelreklamation.",
      notice: "Arbeitsübersetzung. Online-Formulare sind noch nicht aktiv.",
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
      notice: "Preise sind bestätigt; Live-Dienste von GoPay und Packeta benötigen noch Aktivierung und Produktionsprüfung.",
      sections: [
        { title: "Versand in Tschechien", items: ["Packeta Abholstelle oder Z-BOX: 95 CZK.", "Packeta Hauszustellung: 119 CZK.", `Persönliche Abholung in ${company.address.street}, ${company.address.city}: kostenlos nach Abholbestätigung.`, "Kostenloser Versand ab 1.500 CZK Warenwert nach Rabatt. Eine Nachnahmegebühr bleibt zahlbar."] },
        { title: "Zahlung", items: ["GoPay: kostenlos; verfügbare Online-Methoden hängen von der Händlerkonto-Aktivierung ab.", `Banküberweisung: kostenlos, Konto ${company.bankAccount}, Bestellnummer als Verwendungszweck, Reservierung 3 Kalendertage.`, "Nachnahme: 39 CZK für unterstützte tschechische Packeta-Lieferung.", "Persönliche Abholung unterstützt GoPay oder Vorausüberweisung, keine Nachnahme."] },
        { title: "Bearbeitung und Abholung", paragraphs: ["Der Gesamtpreis wird vor dem Absenden angezeigt. Bestelleingang und Versand werden per E-Mail bestätigt. Der konkrete Versandtermin hängt vom Bestand ab.", `Die persönliche Abholung in ${company.address.street}, ${company.address.district} ist kein Laden mit regelmäßigen Öffnungszeiten. Kommen Sie erst nach Terminbestätigung.`] },
        { title: "Weitere EU-Länder", paragraphs: ["Eine Versandpauschale von 14,50 EUR ist ohne kostenlosen Versand und Nachnahme vorbereitet. Der internationale Checkout bleibt deaktiviert, bis Länder, Dienste, EUR-Produktpreise und Live-Zahlungen bestätigt sind."] },
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
        { title: "4. Materialien und Oberflächen", paragraphs: ["Edelstahl ist robust, kann aber zerkratzen oder matt werden. Vergoldete und andere Oberflächen nutzen sich mit der Zeit ab; weniger Wasser, Kosmetik und Reibung verlängern die Lebensdauer.", "Silber kann durch Luft, Schweiß oder Haut-pH natürlich oxidieren. Silberpflege nur bei Eignung verwenden und nicht ungeprüft auf Perlen, Beschichtungen oder empfindliche Steine auftragen."] },
        { title: "5. Aufbewahrung", paragraphs: ["Schmuck trocken, vor direktem Sonnenlicht geschützt und getrennt in einer Box oder einem weichen Beutel aufbewahren. Ketten schließen und von Schlüsseln und Münzen fernhalten."] },
        { title: "6. Beratung", paragraphs: [`Bei Fragen zur Pflege eines bestimmten Schmuckstücks schreiben Sie an ${company.email}. Schmuck mit lockerem Verschluss, Stein oder Fassung bis zur Prüfung nicht weiter tragen.`] }
      ]
    }
  }
};
