export const company = {
  brand: "AMARÉE",
  legalName: "MEDIANUM s.r.o.",
  companyId: "25882384",
  vatPayer: false,
  email: "info@amaree.cz",
  phone: "+420 777 705 682",
  bankAccount: "3361675015/3030",
  registeredAt: "2001-06-21",
  registerEntry: "Krajský soud v Ostravě, oddíl C, vložka 24429",
  address: {
    street: "Příčná 129/3",
    district: "Hodolany",
    postalCode: "779 00",
    city: "Olomouc",
    countryCode: "CZ",
    country: "Česká republika"
  }
} as const;

export const companyAddressLines = [
  company.legalName,
  company.address.street,
  company.address.district,
  `${company.address.postalCode} ${company.address.city}`,
  company.address.country
] as const;
