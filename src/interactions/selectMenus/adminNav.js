import { handleNav, handlePanelSelect } from '../../handlers/adminDashboard.js';

export default [
  {
    name: 'admin_nav',
    async execute(interaction, client) {
      await handleNav(interaction, client);
    },
  },
  {
    name: 'admin_panel_select',
    async execute(interaction, client) {
      await handlePanelSelect(interaction, client);
    },
  },
];
