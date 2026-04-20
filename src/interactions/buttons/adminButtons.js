import {
  handleBack,
  handleTicketList,
  handleTicketNew,
  handleTicketEdit,
  handleTicketDelete,
  handleTicketDeploy,
  handleWelcomeEdit,
  handleGoodbyeEdit,
  handleLoggingEdit,
  handleCreateTicketPanel,
} from '../../handlers/adminDashboard.js';

export default [
  {
    name: 'admin_back',
    async execute(interaction, client) {
      await handleBack(interaction, client);
    },
  },
  {
    name: 'admin_ticket_list',
    async execute(interaction, client) {
      await handleTicketList(interaction, client);
    },
  },
  {
    name: 'admin_ticket_new',
    async execute(interaction, client) {
      await handleTicketNew(interaction, client);
    },
  },
  {
    name: 'admin_ticket_edit',
    async execute(interaction, client, args) {
      await handleTicketEdit(interaction, client, args[0]);
    },
  },
  {
    name: 'admin_ticket_delete',
    async execute(interaction, client, args) {
      await handleTicketDelete(interaction, client, args[0]);
    },
  },
  {
    name: 'admin_ticket_deploy',
    async execute(interaction, client, args) {
      await handleTicketDeploy(interaction, client, args[0]);
    },
  },
  {
    name: 'admin_welcome_edit',
    async execute(interaction, client) {
      await handleWelcomeEdit(interaction, client);
    },
  },
  {
    name: 'admin_goodbye_edit',
    async execute(interaction, client) {
      await handleGoodbyeEdit(interaction, client);
    },
  },
  {
    name: 'admin_logging_edit',
    async execute(interaction, client) {
      await handleLoggingEdit(interaction, client);
    },
  },
  {
    name: 'create_ticket_panel',
    async execute(interaction, client, args) {
      await handleCreateTicketPanel(interaction, client, args[0]);
    },
  },
];
