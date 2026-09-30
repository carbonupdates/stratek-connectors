// booking_com -- See Booking.com reservations for your property.
//
// STATUS: planned (scaffold). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.
// API: Booking.com Connectivity Partner Programme only (approval required).

import { notBuilt } from './_scaffold.js';

export default {
  id: "booking_com",
  name: "Booking.com",
  category: "hospitality",
  status: 'planned',
  description: "See Booking.com reservations for your property.",
  docsUrl: "https://connect.booking.com/",
  secrets: [
    {
      "name": "BOOKING_COM_USERNAME",
      "label": "Connectivity username"
    },
    {
      "name": "BOOKING_COM_PASSWORD",
      "label": "Connectivity password"
    },
    {
      "name": "BOOKING_COM_HOTEL_ID",
      "label": "Hotel ID"
    }
  ],
  actions: [
    {
      id: "reservations",
      label: "Booking.com reservations",
      placement: ["settings"],
      fields: [],
      run: notBuilt("Booking.com"),
    },
  ],
};
