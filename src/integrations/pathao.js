// pathao -- "Send with Pathao" on a sale.
//
// NOT ENABLED YET (enabled: false): waiting for the Pathao API details
// (endpoints, auth, sandbox vs live). The shape below is what the POS will
// show; `run` is filled in with the real API calls in the next release.

export default {
  id: 'pathao',
  name: 'Pathao',
  description: 'Book a Pathao delivery for a sale.',
  enabled: false,
  secrets: [
    { name: 'PATHAO_CLIENT_ID', label: 'Pathao client ID' },
    { name: 'PATHAO_CLIENT_SECRET', label: 'Pathao client secret' },
  ],
  actions: [
    {
      id: 'create_delivery',
      label: 'Send with Pathao',
      placement: ['transaction'],
      fields: [
        { name: 'recipientName', label: 'Recipient name', type: 'text', required: true },
        { name: 'recipientPhone', label: 'Recipient phone', type: 'tel', required: true },
        { name: 'recipientAddress', label: 'Delivery address', type: 'text', required: true },
        { name: 'codAmount', label: 'Cash to collect (0 if paid)', type: 'number', required: true, default: 0 },
        { name: 'note', label: 'Note for rider', type: 'text' },
      ],
      async run() {
        return { type: 'message', title: 'Not available yet', text: 'The Pathao integration is not enabled in this connector version.' };
      },
    },
  ],
};
