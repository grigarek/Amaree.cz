# Checkout, platby a rezervace

Centrální konfigurace: `src/lib/commerce/config.ts`. Částky jsou celá čísla v nejmenších jednotkách měny.

## Česká republika

| Doprava | Cena | GoPay | Dobírka | Bankovní převod |
| --- | ---: | :---: | :---: | :---: |
| Packeta na adresu | 11 900 haléřů | ano | +3 900 haléřů | ano |
| Packeta výdejní místo / Z-BOX | 9 500 haléřů | ano | +3 900 haléřů | ano |
| Osobní odběr Olomouc | 0 | ano | ne | ano |

Doprava je zdarma od 150 000 haléřů hodnoty zboží po slevě. Dobírkový poplatek se nevynuluje. Osobní odběr je vždy zdarma.

## Evropská unie

Podporované kódy jsou omezené na státy EU. Mimo ČR je připravená metoda `eu_delivery` za 1 450 eurocentů. Doprava zdarma ani dobírka se nepoužijí. GoPay je jediná zapnutá platební metoda. Klasický převod se zapne až po potvrzení účtu vhodného pro EUR.

Checkout podporuje pouze Česko a Slovensko. Aktivní produkt musí mít samostatně potvrzenou cenu CZK i EUR; nepoužívá se automatický měnový přepočet. Další země zůstávají zakázané.

## Rezervace skladu

- GoPay: objednávka `awaiting_payment`, aktivní rezervace 30 minut.
- Bankovní převod: objednávka `awaiting_bank_transfer`, aktivní rezervace 3 kalendářní dny, unikátní variabilní symbol z čísla objednávky.
- Dobírka: objednávka `confirmed_cod`, po potvrzení objednávky se rezervace rovnou považuje za definitivní odečet.
- Potvrzení platby mění aktivní rezervaci na `committed` pouze jednou.
- Expirace mění dosud aktivní rezervaci na `released` a vrací kus do dostupného množství.

Produkční provedení musí používat databázovou transakci, zámky řádků a unikátní události. Návrh tabulek je v `supabase/migrations/202607150001_packeta_gopay_draft.sql` a nesmí se aplikovat bez revize.
