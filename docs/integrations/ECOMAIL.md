# Ecomail

Stav: serverový adaptér, textové/HTML stavové šablony, databázová deduplikace a historie jsou implementované. Odesílání je vypnuté přes `ECOMAIL_SEND_ENABLED=false`.

Potvrzená zákaznická e-mailová identita je `AMARÉE <info@amaree.cz>`. Schránka a příchozí odpovědi zůstávají u Active24. Aplikace nepoužívá heslo schránky ani přímé IMAP/SMTP připojení; transakční zprávy odesílá přes HTTPS API Ecomailu a `reply_to` směruje na `info@amaree.cz`. Tím zůstává řešení kompatibilní s Cloudflare Workers a heslo k poště není součástí aplikačních secrets.

Objednávková šablona je na poskytovateli nezávislá a obsahuje provozovatele, dopravu, platbu, celkovou cenu, vratkovou adresu a u klasického bankovního převodu také účet, variabilní symbol a splatnost.

## Potřebné údaje

- Ecomail API key uložený pouze na serveru,
- ID seznamu pro newsletter,
- potvrzená odesílací doména a DNS záznamy,
- odesílací e-mail a jméno,
- ID nebo názvy schválených transakčních šablon,
- rozhodnutí o double opt-in pro newsletter,
- požadované seznamy, segmenty a jazyky CS/EN/DE,
- retenční pravidla a způsob evidence souhlasů,
- produkční kontaktní adresa pro odpovědi a odhlášení.

Pro AMARÉE jsou potvrzené hodnoty `ECOMAIL_FROM_EMAIL=info@amaree.cz` a `ECOMAIL_FROM_NAME=AMARÉE`. Před zapnutím odesílání je stále nutné ověřit doménu v Ecomailu, doplnit jím požadované SPF/DKIM záznamy bez poškození existujících MX záznamů Active24 a provést test doručitelnosti i odpovědi zákazníka.

Do aktivace Ecomailu se zpráva uloží jako `queued` s preview identifikátorem, ale neopustí aplikaci. Newsletter zůstává samostatný a nesmí se směšovat s transakčními zprávami.

## Transakční objednávkové zprávy

Ecomail transakční API vyžaduje placený účet a ověřenou odesílací doménu. Obsah objednávky a tracking doplňuje backend; objednávková data se nečtou z newsletterového feedu.

Každá zpráva nejprve získá unikátní `dedupe_key` v `email_messages`. Opakovaný automatický milník se ignoruje, ruční opakování dostane nový klíč. Retry worker a zpracování webhooků doručitelnosti jsou další provozní krok. Transakční zpráva nesmí obsahovat marketing vyžadující newsletterový souhlas.

Úplný návrh milníků, automatizace a administrátorského odesílání je v `docs/commerce/ORDER_NOTIFICATIONS.md`.
