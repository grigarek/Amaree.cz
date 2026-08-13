# Packeta / Zásilkovna

Stav: widget, serverová validace, vytvoření zásilky, PUDO/home-delivery štítek a tracking jsou implementované, ale tvorba skutečné zásilky zůstává bezpečně vypnutá do řízeného testu. Potvrzené API heslo je uložené pouze jako Cloudflare secret, odesílatel `AMARÉE.CZ` má ID `563773` a home carrier ID jsou `106` pro Česko a `131` pro Slovensko.

## Navržený tok

1. Zákazník vybere Zásilkovnu v checkoutu.
2. Tlačítko otevře oficiální Packeta Widget v6 pro výdejní místa a Z-BOXy.
3. Klient odešle ID a zobrazené údaje bodu na `/api/shipping/packeta/validate`.
4. Server zavolá oficiální validační endpoint se stejnými omezeními jako widget.
5. Do objednávky se uloží kanonické ID, název, ulice, město, PSČ, země a typ bodu.
6. Bez úspěšné validace není možné pokračovat k platbě.

Bez widget klíče používá projekt `PACKETA_VALIDATION_MODE=mock` a jediné lokální testovací místo. Tento režim nesmí vytvářet zásilky.

## Sledování zásilky

Po vytvoření zásilky se uloží Packeta ID, barcode/tracking a veřejný odkaz. Ruční administrátorské akce umí zásilku vytvořit, stáhnout štítek, označit objednávku jako odeslanou a poslat tracking e-mail. Automatická synchronizace přes Push Tracking nebo plánované dotazování zatím není implementovaná.

Stavy Packety se ukládají beze změny do historie, ale zákazníkovi se mapují jen na několik srozumitelných milníků. E-mail se neposílá při každém technickém skenu. Po konečném stavu se pravidelné dotazování zastaví.

Podrobný stavový a notifikační tok je v `docs/commerce/ORDER_NOTIFICATIONS.md`.

## Proměnné prostředí

```text
NEXT_PUBLIC_PACKETA_WIDGET_API_KEY=
PACKETA_VALIDATION_MODE=mock
PACKETA_ENVIRONMENT=test
PACKETA_API_ENABLED=false
PACKETA_API_PASSWORD=
PACKETA_SENDER=
PACKETA_DEFAULT_WEIGHT_KG=0.2
PACKETA_HOME_CARRIER_ID_CZ=
PACKETA_HOME_CARRIER_ID_SK=
```

Widget API key je identifikátor určený widgetu v prohlížeči. API password je serverové tajemství. Packeta nemá oddělený sandbox, proto `PACKETA_API_ENABLED` zůstává `false` až do řízeného testu první zásilky. Zapnutí může vytvořit skutečný záznam zásilky v klientském účtu Packety.

## Řízený předprodukční test

1. Připravit testovací objednávku s odsouhlaseným příjemcem a skutečnou českou nebo slovenskou adresou.
2. Dočasně zapnout `PACKETA_API_ENABLED=true` pouze na stagingu.
3. V administraci vytvořit zásilku a ověřit Packeta ID, čárový kód, A6 štítek a tracking URL.
4. Zásilku nepředávat do sítě Packety; bez fyzického podání nevzniká přepravní služba.
5. Po ověření tvorbu zásilek opět vypnout, dokud nebude schválené produkční spuštění.

## Datový model objednávky

```text
shipping_method: packeta_pickup | packeta_home
packeta_point_id
packeta_point_name
packeta_point_type: pickup-point | zbox
packeta_point_street
packeta_point_city
packeta_point_zip
packeta_point_country
```

Domácí doručení je samostatná metoda `packeta_home` za 119 Kč v ČR a nepoužívá ID výdejního místa. Výdejní místo nebo Z-BOX stojí 95 Kč. Obě sazby se vynulují od 1 500 Kč hodnoty zboží po slevě; případná dobírka 39 Kč zůstává.

## Údaje potřebné od zákaznického účtu Packeta

- widget API key z Klientské sekce,
- potvrzené povolené země a služby,
- zda zobrazovat pouze interní výdejní místa a Z-BOXy, nebo i externí PUDO body,
- cenový model dopravy a hranici dopravy zdarma,
- maximální hmotnost a rozměry zásilky,
- odesílací místo / podací místo pro budoucí expedici,
- fakturační identifikaci účtu Packeta,
- až při tvorbě zásilek serverový API password, který se nikdy nezveřejní v klientu,
- rozhodnutí o dobírce, pojištění, vratkách a Claim Assistant.

## Oficiální dokumentace

- https://docs.packeta.com/cs/docs/pudo-delivery/widget
- https://docs.packeta.com/cs/guides/integration-by-service/packeta-pudo
- https://docs.packeta.com/docs/packet-tracking/tracking
- https://docs.packeta.com/docs/packet-tracking/status-codes
- https://widget.packeta.com/v6/www/js/library.js
- https://widget.packeta.com/v6/pps/api/widget/v1/validate
