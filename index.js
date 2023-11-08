const express = require('express');
const cors = require('cors');
const app = express();
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.sml8dnv.mongodb.net/?retryWrites=true&w=majority`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
  });
  async function run() {
    try {
      // Connect the client to the server	(optional starting in v4.7)
      // await client.connect();
      // Send a ping to confirm a successful connection

      const database = client.db("jobsDB");
      const jobCollection = database.collection("jobs");
      const appliedCollection = database.collection("appliedJobs");

      app.get("/jobs", async (req, res) => {
        const result = await jobCollection.find().toArray();
        res.send(result);
      });

      app.get("/job/:id", async (req, res) => {
        const query = { _id: new ObjectId(req.params.id) };
        const result = await jobCollection.findOne(query);
        res.send(result);
      });

      app.get("/myjobs", async (req, res) => {
        const query = { username: req.query.username};
        const result = await jobCollection.find(query).toArray();
        res.send(result);
      });

      app.post("/apply", async (req, res) => {
        const form = req.body;
        const result = await appliedCollection.insertOne(form);
        await jobCollection.updateOne(
          {_id: new ObjectId(form.jobId)},
          { $inc: {applicants: 1}});
        res.send(result);
      });

      app.post("/add", async (req, res) => {
        const job = req.body;
        const result = await jobCollection.insertOne(job);
        res.send(result);
      });

      app.put("/myjobs/:id", async (req, res) => {
        const filter = { _id: new ObjectId(req.params.id)};
        const {
          username,
          image,
          title,
          category,
          salary,
          description,
          postdate,
          deadline,
          applicants
        } = req.body;

        const updatedJob = {
          $set: {
            username,
            image,
            title,
            category,
            salary,
            description,
            postdate,
            deadline,
            applicants
          }
        };

        const result = await jobCollection.updateOne(filter, updatedJob);
        res.send(result);
      });

      await client.db("admin").command({ ping: 1 });
      console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
      // Ensures that the client will close when you finish/error
      // await client.close();
    }
  }
  run().catch(console.dir);

  app.get("/", (req, res) => {
    res.send("Server Running");
  })
  
  app.listen(port, () => {
      console.log(`Server running on port: ${port}`);
  })