begin;

insert into public.integration_settings(key, value, description)
values (
  'storefront_maintenance',
  '{
    "enabled": false,
    "countdownEnabled": false,
    "headline": {
      "cs": "Právě pro vás něco vylepšujeme",
      "sk": "Práve pre vás niečo vylepšujeme"
    },
    "message": {
      "cs": "E-shop je krátce mimo provoz. Brzy se vrátíme s ještě příjemnějším nákupem.",
      "sk": "E-shop je krátko mimo prevádzky. Čoskoro sa vrátime s ešte príjemnejším nákupom."
    },
    "expectedBackAt": null
  }'::jsonb,
  'Storefront maintenance mode and public customer message.'
)
on conflict (key) do nothing;

commit;
