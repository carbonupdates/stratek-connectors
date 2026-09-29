// slant3d -- 3D print-on-demand: price a print, place a print order and track it with Slant 3D.
//
// STATUS: planned (scaffold). Stratek lists it as "Coming soon"; no buttons
// and no key form yet. The key fields and buttons below are a first draft --
// adjust them to the real API when building it, write each action's `run`,
// then set status to 'available'. See docs/adding-an-integration.md.

import { notBuilt } from './_scaffold.js';

export default {
  id: "slant3d",
  name: "Slant 3D",
  category: "fulfilment",
  status: 'planned',
  description: "3D print-on-demand: price a print, place a print order and track it with Slant 3D.",
  docsUrl: "https://slant3dapi.com/documentation/introduction",
  secrets: [
    {
      name: "SLANT3D_API_KEY",
      label: "Slant 3D API key"
    }
  ],
  actions: [
    {
      id: "estimate",
      label: "Get 3D print quote",
      placement: [
        "settings"
      ],
      fields: [],
      run: notBuilt("Slant 3D"),
    },
    {
      id: "place_order",
      label: "Order 3D print (Slant 3D)",
      placement: [
        "transaction"
      ],
      fields: [
        {
          name: "fileUrl",
          label: "Model file URL (STL)",
          type: "text",
          required: true
        },
        {
          name: "recipientName",
          label: "Ship to (name)",
          type: "text",
          required: true
        },
        {
          name: "recipientAddress",
          label: "Shipping address",
          type: "text",
          required: true
        }
      ],
      run: notBuilt("Slant 3D"),
    },
    {
      id: "track",
      label: "Track Slant 3D order",
      placement: [
        "transaction"
      ],
      fields: [],
      run: notBuilt("Slant 3D"),
    },
  ],
};
