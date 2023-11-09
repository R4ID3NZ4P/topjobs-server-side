const express = require('express');
const cors = require('cors');
const app = express();
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;

// middlewares
app.use(cors({
  origin: ["http://localhost:5173", "https://b8a11-topjobs-3e758.web.app", "https://b8a11-topjobs-3e758.firebaseapp.com"],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());
const verifyToken = (req, res, next) => {
  const token = req?.cookies?.token;
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
      if(err) return res.status(401).send({message: "Unauthorized Access"});
      req.user = decoded;
      next();
  })
}

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

      app.get("/myjobs", verifyToken, async (req, res) => {
        console.log(req?.user);
        const query = { username: req.query.username};
        if(query.username !== req.user.name) {
          return res.status(403).send({message: "Forbidden Access"});
        }
        const result = await jobCollection.find(query).toArray();
        res.send(result);
      });

      app.get("/applied/:name", verifyToken, async (req, res) => {
        console.log(req?.user);
        const query = { name: req.params.name};
        if(query.name !== req.user.name) {
          return res.status(403).send({message: "Forbidden Access"});
        }
        const jobs = await appliedCollection.find(query).toArray();
        const jobsQuery = jobs.map(job => new ObjectId(job.jobId));
        const result = await jobCollection.find({ _id: { $in: jobsQuery}}).toArray();
        res.send(result);
      });

      app.post("/jwt", async (req, res) => {
        const data = req.body;
        console.log(data);
        const token = jwt.sign(data, process.env.ACCESS_TOKEN_SECRET, {expiresIn: "1h"});
        res.cookie("token", token, {
          httpOnly: true,
          secure: true,
          sameSite: "none"
        }).send({success: true});
      });

      app.post("/logout", async (req, res) => {
        console.log(req.body);
        res.clearCookie("token", {maxAge: 0}).send({success: true});
      })

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

      app.delete("/myjobs/:id", async (req, res) => {
        const filter = { _id: new ObjectId(req.params.id)};
        const result = await jobCollection.deleteOne(filter);
        res.send(result);
      })

      await client.db("admin").command({ ping: 1 });
      console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
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