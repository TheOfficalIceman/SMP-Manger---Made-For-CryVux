import { handleModalSubmit } from '../../handlers/adminDashboard.js';

export default [
  {
    name: 'admin_modal',
    async execute(interaction, client, args) {
      await handleModalSubmit(interaction, client, args);
    },
  },
];
