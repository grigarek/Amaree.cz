# Objednávkové notifikace a sledování zásilky

Tento dokument definuje proces automatických a ručních zpráv zákazníkovi. Implementace ukládá deduplikované zprávy do `email_messages`, používá aktivní adaptér Resend, umí CS/SK preview, ruční opakování a bezpečné interní limity. Odesílání zůstává vypnuté do schváleného staging testu. Automatický tracking zůstává navazující práce.

## Základní princip

Každá důležitá změna vytvoří nejprve trvalou událost objednávky. Z ní vznikne položka v transakční e-mailové frontě. E-mail se neposílá přímo uvnitř změny stavu, aby výpadek poskytovatele neztratil zprávu ani nerozbil objednávku.

Fronta musí podporovat opakování po dočasné chybě, konečný stav doručení, identifikátor poskytovatele a unikátní idempotency klíč. Kombinace objednávky, typu události a verze změny se smí odeslat pouze jednou.

## Zákaznické milníky

Zákazník nemá dostávat e-mail při každém technickém skenu dopravce. Odesílají se pouze srozumitelné milníky:

| Milník | Spuštění | Zpráva zákazníkovi |
| --- | --- | --- |
| Objednávka přijata | po úspěšném uložení objednávky | číslo, položky, ceny, doprava, platba, adresy, další postup a příloha s obchodními podmínkami platnými při objednání |
| Čekáme na platbu | bankovní převod | účet, variabilní symbol a splatnost |
| Platba potvrzena | pouze po serverovém ověření GoPay nebo spárování převodu | potvrzení platby a zahájení přípravy |
| Objednávku připravujeme | potvrzená interní změna | stručná informace; může být sloučena s potvrzením platby |
| Zásilka předána dopravci | vytvořená a skutečně podaná zásilka | Packeta ID, odkaz na tracking a způsob doručení |
| Připraveno k vyzvednutí | zákaznický stav Packety `ready for pickup` | místo, případně doba uložení a odkaz na tracking |
| Doručeno / vyzvednuto | konečný stav dopravce | potvrzení dokončení bez marketingového obsahu |
| Problém s doručením nebo návrat | vybrané problémové stavy dopravce | jasná instrukce a kontakt na podporu; současně upozornění administrátorovi |
| Zrušeno / refundováno | potvrzená změna v administraci nebo platbě | částka, způsob vrácení a očekávaný další postup |

Právní okamžik uzavření smlouvy a přesné znění prvního e-mailu musí před produkcí potvrdit majitel a právní kontrola.

## Platby

- Objednávka se nejdříve bezpečně uloží a teprve potom se zařadí potvrzovací e-mail.
- GoPay notifikace je pouze podnět. Platba se označí jako zaplacená až po server-to-server ověření u GoPay.
- Opakovaný GoPay webhook nesmí vytvořit druhou událost ani druhý e-mail.
- U dobírky se objednávka potvrzuje bez čekání na platbu.
- U bankovního převodu první e-mail obsahuje platební údaje; druhý se odešle až po spárování platby.
- Povinný souhlas s obchodními podmínkami kontroluje klient i server. Objednávka ukládá čas souhlasu, verzi a přesný obsah podmínek.
- První potvrzení nebo výzva k platbě přikládá uložený snapshot jako samostatný UTF-8 HTML soubor; pozdější stavové e-maily jej znovu nepřikládají.

## Packeta a automatický tracking

Po vytvoření zásilky se ukládá Packeta ID, veřejný tracking odkaz, případný externí tracking kód, aktuální stav a úplná historie přijatých změn.

Preferované pořadí synchronizace:

1. využít oficiální Push Tracking, pokud bude pro účet aktivovaný a produkčně ověřený,
2. ponechat plánovanou serverovou synchronizaci jako zálohu,
3. pro zásilky v síti Packety používat `packetStatus()` a `packetTracking()`, pro externího dopravce po předání také `packetCourierTracking()`,
4. synchronizovat jen aktivní nedokončené zásilky a po konečném stavu dotazování zastavit,
5. více technických stavů mapovat na menší počet zákaznických milníků.

Oficiální Packeta tracking URL má tvar `https://tracking.packeta.com/<jazyk>/?id=<PACKETA_ID>`. Interní stav e-shopu nesmí slepě kopírovat text dopravce; ukládá se původní kód i naše stabilní zákaznická kategorie.

Vlastní stránka `https://amaree.cz/sledovani/<veřejný-token>` může později zobrazit zjednodušenou časovou osu, odkaz na Packetu a kontaktní pomoc. Token musí být náhodný a nesmí umožnit odhadnout jinou objednávku ani zpřístupnit nadbytečné osobní údaje.

## Administrace

Detail objednávky musí obsahovat:

- časovou osu objednávky, platby, skladu, zásilky a e-mailů,
- aktuální interní stav a původní stav Packety,
- tracking ID a odkaz otevřený v novém panelu,
- náhled zprávy, která se odešle při změně stavu,
- přepínač `Informovat zákazníka` u ručního zákaznického milníku,
- možnost bezpečně zopakovat neúspěšný nebo vybraný e-mail,
- možnost poslat jednorázovou servisní zprávu s interně uloženým důvodem,
- stav odeslání, čas, příjemce, šablonu a identifikátor poskytovatele,
- audit administrátora, který stav nebo odeslání vyvolal.
- čas souhlasu, verzi a informaci, zda je u objednávky uložen přesný snapshot obchodních podmínek.

Interní změny, například poznámka nebo korekce skladu, zákaznický e-mail automaticky nespouštějí. Hromadná změna stavů musí předem ukázat počet objednávek a počet plánovaných zpráv.

## E-mailový poskytovatel

Obchodní logika zůstává za rozhraním `EmailProvider`. Aktivní volbou je Resend s ověřenou subdoménou `notify.amaree.cz`; Ecomail je vyhrazen pro případný budoucí newsletter. Poskytovatele lze změnit bez změny objednávkového stavového procesu.

Transakční a marketingové zprávy se nesmějí směšovat:

- potvrzení a stav objednávky se posílají bez newsletterového souhlasu, ale pouze s nezbytným provozním obsahem,
- newsletter používá samostatnou evidenci souhlasu a odhlášení,
- data objednávky doplňuje bezpečně backend; neposílají se z klienta,
- šablona má mít HTML i textovou variantu a nemá být postavená jako jeden velký obrázek.

## Datový základ

Minimální produkční tabulky nebo ekvivalenty:

- `order_events` - neměnná časová osa obchodních událostí,
- `shipments` - zásilka, tracking identifikátory a aktuální stav,
- `shipment_events` - původní stavové události dopravce,
- `email_outbox` - zprávy čekající na odeslání a idempotency klíč,
- `email_deliveries` - pokusy, výsledek, provider ID a chyba,
- `admin_audit_log` - ruční stavové změny a opakovaná odeslání.

## Pořadí realizace

1. potvrdit právní okamžik uzavření smlouvy a texty šablon,
2. dokončit transakční ukládání objednávek a `order_events`,
3. doplnit outbox worker a testovací e-mailový provider,
4. zapojit ověřené GoPay události,
5. vytvořit zásilku v Packetě a uložit tracking,
6. zapojit push nebo plánovanou synchronizaci stavů a jejich mapování,
7. doplnit administrační časovou osu, ruční odeslání a audit,
8. ověřit duplicity, výpadky poskytovatele, opakované webhooky a doručitelnost ve vývojovém prostředí.

## Oficiální dokumentace

- Packeta tracking: https://docs.packeta.com/docs/packet-tracking/tracking
- Packeta stavové kódy: https://docs.packeta.com/docs/packet-tracking/status-codes
- Packeta API metody: https://docs.packeta.com/docs/api-reference/api-methods
- Resend domény: https://resend.com/docs/dashboard/domains/introduction
- Resend limity: https://resend.com/docs/knowledge-base/account-quotas-and-limits
- Resend idempotence: https://resend.com/docs/dashboard/emails/idempotency-keys
