const Fakerator = require("fakerator");
const fakerator = Fakerator();
const DbService = require("moleculer-db");

module.exports = {
  name: "articles",

  mixins: [DbService],

  adapter: new DbService.MemoryAdapter(),

  settings: {
    // Available fields
    fields: ["_id", "title", "content", "author", "votes", "created"],

    // Populating
    populates: {
      // Populate the `author` field from `users` service
      author: {
        action: "users.get",
        params: {
          fields: ["firstName", "lastName"]
        }
      }
    },

    // Validation schema for insert & update
    entityValidator: {
      title: { type: "string", empty: false },
      content: { type: "string" },
      author: { type: "string", empty: false }
    }
  },

  hooks: {
    before: {
      create(ctx) {
        ctx.params.votes = 0;
        ctx.params.created = new Date();
      },
      update(ctx) {
        ctx.params.updated = new Date();
      }
    }
  },

  actions: {
    // Define new actions
    vote: {
      params: {
        id: { type: "string" }
      },
      async handler(ctx) {
        const res = await this.adapter.updateById(ctx.params.id, {
          $inc: { votes: 1 }
        });
        return await this.transformDocuments(ctx, {}, res);
      }
    },

    unvote: {
      params: {
        id: { type: "string" }
      },
      async handler(ctx) {
        const res = await this.adapter.updateById(ctx.params.id, {
          $inc: { votes: -1 }
        });
        return await this.transformDocuments(ctx, {}, res);
      }
    }
  },

  methods: {
    /**
     * Seeding articles DB.
     */
    async seedDB() {
      this.logger.info("Seed Articles database...");

      // Waiting for "users" service to get a list of all users.
      await this.waitForServices("users");
      let authors = (await this.broker.call("users.list")).rows;

      if (!authors || authors.length === 0) {
        await this.Promise.delay(2000);
        authors = (await this.broker.call("users.list")).rows;
      }

      this.logger.info("Authors: ", authors);

      // Generate fake articles
      const fakeArticles = fakerator.times(fakerator.entity.post, 10);

      // Set author of articles
      fakeArticles.forEach(article => {
        article.author = fakerator.random.arrayElement(authors)._id;
        article.votes = fakerator.random.number(10);
      });

      // Save to DB
      const savedArticles = await this.adapter.insertMany(fakeArticles);

      this.logger.info(
        `Created ${savedArticles.length} fake articles.`,
        savedArticles
      );
    }
  },

  /**
   * Service started lifecycle event handler
   */
  async started() {
    if ((await this.adapter.count()) === 0) {
      await this.seedDB();
    } else {
      this.logger.info(`DB contains ${await this.adapter.count()} articles.`);
    }
  },

  /**
   * Service stopped lifecycle event handler
   */
  stopped() {}
};
