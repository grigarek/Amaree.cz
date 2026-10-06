# Fakturoid

## Rozdělení odpovědnosti

- Supabase a administrace AMARÉE jsou jediným zdrojem produktů, skladu, objednávek a jejich stavů.
- Fakturoid dostává neměnný snímek položek dokončené objednávky a vede účetní doklad.
- Fakturoid nesnižuje sklad a nevrací produktová data zpět do katalogu.
- Nákladové doklady se ukládají a zpracovávají přímo ve Fakturoidu.

## Bezpečný tok

1. GoPay webhook označí platbu jako uhrazenou, případně správce ověří bankovní převod.
2. Zásilkovna nebo správce označí objednávku jako doručenou.
3. Podle nastavení vznikne ve Fakturoidu zákazník a faktura.
4. E-shop před vytvořením vždy hledá fakturu podle UUID objednávky. Databáze navíc dovolí jediný doklad poskytovatele na objednávku.
5. Je-li objednávka prokazatelně zaplacená, Fakturoid dostane datum úhrady.
6. Po úspěšném vytvoření lze fakturu automaticky odeslat zákazníkovi. Číslo a odkazy se uloží k objednávce.
7. Chyba Fakturoidu nikdy nezruší platbu, zásilku ani zákaznický stav objednávky. Správce může akci zopakovat.

## Aktivace

1. Ve Fakturoidu vytvořit účet firmy, doplnit bankovní účet a zkontrolovat neplátcovství DPH.
2. V uživatelském nastavení Fakturoidu získat Client ID a Client Secret pro serverové přihlášení.
3. Do Cloudflare Secrets uložit `FAKTUROID_CLIENT_ID` a `FAKTUROID_CLIENT_SECRET`.
4. Do Cloudflare proměnných uložit `FAKTUROID_ACCOUNT_SLUG`.
5. Spustit migraci `202608030001_fakturoid_integration.sql` nejprve na vývojové databázi.
6. Nastavit `FAKTUROID_API_ENABLED=true` jen na testovacím prostředí.
7. V `/admin/settings/fakturoid` ponechat režim `Pouze ručně` a vytvořit jednu kontrolní fakturu bez odeslání.
8. Porovnat zákazníka, položky, slevu, dopravu, měnu, součet, neplátcovství DPH a datum úhrady.
9. Otestovat odeslání na `info@amaree.cz` a storno/opravu podle účetního postupu.
10. Teprve po schválení zvolit automatické vytvoření po doručení.

## Air Bank a GoPay

Fakturoid může párovat příchozí platby z Air Bank a GoPay podle částky a variabilního symbolu. Tuto funkci je nutné nastavit přímo ve Fakturoidu a ověřit na kontrolní platbě. E-shop současně považuje GoPay webhook za autoritativní potvrzení online platby. Dvojí zápis úhrady chrání kontrola aktuálního stavu faktury.

## Provozní omezení

- Odesílání faktur přes API je dostupné jen v placeném tarifu Fakturoidu.
- Přístupové údaje se nezapisují do databáze, administrace, repozitáře ani dokumentace.
- Integrace je ve výchozím stavu dvojitě vypnutá: serverovou proměnnou a přepínačem v administraci.
- Skutečné faktury se nesmí vytvářet, dokud není ověřen účet, číselná řada, bankovní účet a účetní postup firmy.
