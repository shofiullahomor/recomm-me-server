require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 5000;

// MIDDLE WARE
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.zpfgk.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const db = client.db("recommendation");
    const queriesCollection = db.collection("queries");
    const recommendCollection = db.collection("recommend");

    // -- recommend collections -- //

    //post recommendations
    app.post("/recommend", async (req, res) => {
      const recommendation = req.body;
      const result = await recommendCollection.insertOne(recommendation);
      if (result.insertedId) {
        const queryFilter = { _id: new ObjectId(recommendation.queryId) };
        const update = { $inc: { recommendationCount: 1 } };

        const incrememntResult = await queriesCollection.updateOne(
          queryFilter,
          update
        );
      }

      res.send(result);
    });
    //get recommendations by me
    app.get("/recommended-by-me/:email", async (req, res) => {
      let email = req.params.email;
      let filter = { recommenderEmail: email };

      let result = await recommendCollection.find(filter).toArray();
      res.send(result);
    });

    //  --- queries collections --- //
    // save all query in db
    app.post("/queries", async (req, res) => {
      const formInfo = req.body;
      const result = await queriesCollection.insertOne(formInfo);
      console.log(result);
      res.send(result);
    });
    // get all query created by specific user
    app.get("/queries/:email", async (req, res) => {
      const email = req.params.email;
      const query = { "buyer.email": email };
      const result = await queriesCollection.find(query).toArray();
      res.send(result);
    });
    // delete a query from database
    app.delete("/query/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await queriesCollection.deleteOne(query);
      res.send(result);
    });
    // get a single query by Id from db
    app.get("/query/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await queriesCollection.findOne(query);
      res.send(result);
    });
    //get single query
    app.get("/queries/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await queriesCollection.findOne(filter);
      res.send(result);
    });
    // update query
    app.put("/update-query/:id", async (req, res) => {
      const id = req.params.id;
      const formInfo = req.body;
      const updated = {
        $set: formInfo,
      };
      const query = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const result = await queriesCollection.updateOne(query, updated, options);
      console.log(result);
      res.send(result);
    });
    //  get all query data from db
    app.get("/queries", async (req, res) => {
      const result = await queriesCollection.find().toArray();
      res.send(result);

      // let limit = parseInt(req.query.limit) || 0;

      // let result;
      // if (limit > 0) {
      //   result = await queries.find().limit(limit).toArray();
      // } else {
      //   result = await queries.find().toArray();
      // }
      // res.send(result);
    });
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("recommendation site is runnding");
});

app.listen(port, () => {
  console.log(`recommendation site is running on ${port}`);
});
