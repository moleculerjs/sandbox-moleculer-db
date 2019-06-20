const Fakerator = require("fakerator");
const fakerator = Fakerator();
const DbService = require("moleculer-db");

module.exports = {
  name: "users",

  mixins: [DbService],

  adapter: new DbService.MemoryAdapter(),

  settings: {
    // Available fields
    fields: ["_id", "firstName", "lastName", "email", "avatar", "status"]
  },

  actions: {},

  methods: {
    /**
     * Seeding Users DB
     */
    async seedDB() {
      this.logger.info("Seed Users database...");
      const fakeUsers = fakerator.times(fakerator.entity.user, 10);
      const savedUsers = await this.adapter.insertMany(fakeUsers);
      this.logger.info(`Created ${savedUsers.length} fake users.`, savedUsers);
    }
  },

  /**
   * Service started lifecycle event handler
   */
  async started() {
    if ((await this.adapter.count()) === 0) {
      await this.seedDB();
    } else {
      this.logger.info(`DB contains ${await this.adapter.count()} users.`);
    }
  },

  /**
   * Service stopped lifecycle event handler
   */
  stopped() {}
};
