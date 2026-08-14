# Checkout, platby a rezervace

Centrální konfigurace: `src/lib/commerce/config.ts`. Částky jsou celá čísla v nejmenších jednotkách měny.

## Česká republika

| Doprava | Cena | GoPay | Dobírka | Bankovní převod |
| --- | ---: | :---: | :---: | :---: |
| Packeta na adresu | 11 900 haléřů | ano | +3 900 haléřů | ano |
| Packeta výdejní místo / Z-BOX | 9 500 haléřů | ano | +3 900 haléřů | ano |

Doprava je zdarma od 150 000 haléřů hodnoty zboží po slevě. Dobírkový poplatek se nevynuluje.

## Slovensko

| Doprava | Cena | GoPay | Dobírka | Bankovní převod |
| --- | ---: | :---: | :---: | :---: |
| Packeta na adresu | 850 eurocentů | ano | +150 eurocentů po ověření služby | ne |
| Packeta výdejní místo | 850 eurocentů | ano | +150 eurocentů po ověření služby | ne |
| Packeta Z-BOX | 850 eurocentů | ano | +150 eurocentů pouze po potvrzení podpory | ne |

Doprava zdarma se na Slovensko neposkytuje. Dobírka se v checkoutu zobrazí jen u konkrétní služby, kterou administrátor označil jako ověřenou v účtu Packety. Při online platbě je cena dopravy 850 eurocentů; při ověřené dobírce je doprava a platební poplatek dohromady 1 000 eurocentů. Bankovní převod je pro Slovensko skrytý, dokud nebude schválený EUR účet a IBAN.

Checkout podporuje pouze Česko a Slovensko. Aktivní produkt musí mít samostatně potvrzenou cenu CZK i EUR; nepoužívá se automatický měnový přepočet. Další země zůstávají zakázané.

## Souhlas a obchodní podmínky

- Checkout nelze odeslat bez výslovného souhlasu s obchodními podmínkami a zásadami ochrany osobních údajů.
- Server nepřijme payload bez `termsAccepted: true`; klientská kontrola sama o sobě nestačí.
- Po vytvoření objednávky se uloží čas souhlasu, stabilní verze a přesný snapshot podmínek.
- Uložená verze se přikládá k prvnímu potvrzovacímu e-mailu nebo výzvě k platbě a zůstává dohledatelná v administraci.

## Rezervace skladu

- GoPay: objednávka `awaiting_payment`, aktivní rezervace 30 minut.
- Bankovní převod: objednávka `awaiting_bank_transfer`, aktivní rezervace 3 kalendářní dny, unikátní variabilní symbol z čísla objednávky.
- Dobírka: objednávka `confirmed_cod`, po potvrzení objednávky se rezervace rovnou považuje za definitivní odečet.
- Potvrzení platby mění aktivní rezervaci na `committed` pouze jednou.
- Expirace mění dosud aktivní rezervaci na `released` a vrací kus do dostupného množství.

Produkční provedení musí používat databázovou transakci, zámky řádků a unikátní události. Návrh tabulek je v `supabase/migrations/202607150001_packeta_gopay_draft.sql` a nesmí se aplikovat bez revize.
