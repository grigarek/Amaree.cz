const czechVocatives: Record<string, string> = {
  adam: "Adame",
  aneta: "Aneto",
  anette: "Anette",
  anna: "Anno",
  barbora: "Barboro",
  david: "Davide",
  eva: "Evo",
  hana: "Hano",
  jan: "Jane",
  jana: "Jano",
  jakub: "Jakube",
  josef: "Josefe",
  katerina: "Kateřino",
  lucie: "Lucie",
  martin: "Martine",
  martina: "Martino",
  michal: "Michale",
  monika: "Moniko",
  ondrej: "Ondřeji",
  pavla: "Pavlo",
  petr: "Petře",
  petra: "Petro",
  roman: "Romane",
  tomas: "Tomáši",
  veronika: "Veroniko",
  zuzana: "Zuzano"
};

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("cs");
}

export function customerFirstName(value: string) {
  return value.trim().split(/\s+/)[0] ?? "";
}

export function czechVocative(value: string) {
  const firstName = customerFirstName(value);
  if (!firstName) return "";
  const known = czechVocatives[normalize(firstName)];
  if (known) return known;

  // The -a to -o change is reliable for ordinary Czech female given names.
  if (/a$/i.test(firstName) && firstName.length > 2) return `${firstName.slice(0, -1)}o`;
  return firstName;
}

export function customerGreeting(locale: "cs" | "sk", firstName: string) {
  const name = locale === "cs" ? czechVocative(firstName) : customerFirstName(firstName);
  return locale === "sk" ? `Dobrý deň ${name},` : `Dobrý den ${name},`;
}
