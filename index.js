require("dotenv").config();
const express = require("express");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 5000;

// MIDDLE WARE
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://recomm-me.web.app",
      "https://recomm-me.firebaseapp.com",
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).send({ message: "unauthorized access" });
  }

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "unauthorized access" });
    }
    next();
  });
};

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

    // jwt token related api
    app.post("/jwt", async (req, res) => {
      const email = req.body;
      const token = jwt.sign(email, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1d",
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true });
    });
    app.post("/logout", (req, res) => {
      res
        .clearCookie("token", {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true });
    });

    // -- recommend collections -- //
    //get all recommendations by query id
    app.get("/recommendations/:id", async (req, res) => {
      let queryId = req.params.id;
      let filter = { queryId: queryId };

      let result = await recommendCollection.find(filter).toArray();

      res.send(result);
    });
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
    // recommendations for me
    app.get("/recommendedForMe/:email", async (req, res) => {
      let email = req.params.email;
      let filter = { recommenderEmail: email };

      let result = await recommendCollection.find(filter).toArray();
      res.send(result);
    });
    //delete recommendation
    app.delete("/recommendations/:id", async (req, res) => {
      let id = req.params.id;
      let filter = { _id: new ObjectId(id) };

      let recommendation = await recommendCollection.findOne(filter);

      let result = await recommendCollection.deleteOne(filter);

      //decrease the recommendation count
      if (result.deletedCount === 1) {
        let queryFilter = { _id: new ObjectId(recommendation.queryId) };
        let update = { $inc: { recommendationCount: -1 } };

        let decrememntResult = await queriesCollection.updateOne(
          queryFilter,
          update
        );
      }

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

    //search queries in queries page
    app.get("/search", async (req, res) => {
      let query = req.query.q;
      let filter = {
        productName: { $regex: query, $options: "i" },
      };
      let result = await queriesCollection.find(filter).toArray();

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
    // await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );
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
