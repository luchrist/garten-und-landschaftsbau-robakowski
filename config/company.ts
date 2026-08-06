// Bridge file: maps the two factory-generated data modules into one object
// with trade-appropriate naming. The factory writes lib/restaurant.ts (company
// record), lib/reviews-data.ts (Google reviews) and lib/galabau.ts (services,
// Einsatzgebiet, estimator, recruiting). Components import from here so their
// imports stay stable when the generated files are overwritten.

import { galabau } from "@/lib/galabau";
import { restaurant } from "@/lib/restaurant";
import { reviewsData } from "@/lib/reviews-data";

export type OfficeHoursEntry = {
  day: string;
  hours: string;
};

export type ReviewExcerpt = {
  name: string;
  rating: number;
  date: string;
  text: string;
};

const DAY_ABBREVIATIONS: Record<string, string> = {
  Montag: "Mo",
  Dienstag: "Di",
  Mittwoch: "Mi",
  Donnerstag: "Do",
  Freitag: "Fr",
  Samstag: "Sa",
  Sonntag: "So"
};

function compactDayLabel(label: string): string {
  const present = Object.keys(DAY_ABBREVIATIONS).filter((day) => label.includes(day));
  if (present.length > 1) {
    return `${DAY_ABBREVIATIONS[present[0]]} – ${DAY_ABBREVIATIONS[present[present.length - 1]]}`;
  }
  return label;
}

export const company = {
  name: restaurant.name,
  shortName: restaurant.shortName,
  tagline: restaurant.tagline,
  logoGlyph: restaurant.logoGlyph,
  address: {
    street: restaurant.address.street,
    cityLine: restaurant.address.cityLine,
    city: restaurant.address.city
  },
  contact: {
    phone: galabau.contact.phone || restaurant.phone,
    phoneLink: galabau.contact.phoneLink || restaurant.phoneLink,
    email: galabau.contact.email || restaurant.email,
    whatsapp: galabau.contact.whatsapp,
    whatsappLink: galabau.contact.whatsappLink
  },
  officeHours: restaurant.hours.map<OfficeHoursEntry>((entry) => ({
    day: compactDayLabel(entry.day),
    hours: entry.closed ? "Geschlossen" : entry.time
  })),
  reviews: {
    rating: reviewsData.overallRating,
    count: reviewsData.totalRatings,
    source: "Google",
    excerpts: reviewsData.reviews.map<ReviewExcerpt>((review) => ({
      name: review.author,
      rating: review.rating,
      date: review.time,
      text: review.text
    }))
  },
  socialMedia: restaurant.socialMedia,
  legal: restaurant.legal,
  mapsUrl: restaurant.mapsUrl,
  googleBusinessProfileUrl: restaurant.googleBusinessProfileUrl,
  seo: restaurant.seo
};

export default company;
