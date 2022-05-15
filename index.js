const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const { MongoClient, ServerApiVersion } = require("mongodb");
const port = process.env.PORT || 5000;

const app = express();

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.osyjv.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "UnAuthorizes access" });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "Forbidden access" });
    }
    req.decoded = decoded;
    console.log(decoded);
    next();
  });
}

async function run() {
  try {
    await client.connect();
    const servicesCollection = client.db("doctors_portal").collection("services");
    const bookingCollection = client.db("doctors_portal").collection("bookings");
    const userCollection = client.db("doctors_portal").collection("users");

    app.get("/service", async (req, res) => {
      const query = {};
      const cursor = servicesCollection.find(query);
      const services = await cursor.toArray();
      res.send(services);
    });
    app.get('/user',verifyJWT, async(req,res)=>{
        const users = await userCollection.find().toArray();
        res.send(users);
    })
    app.put("/user/admin/:email",verifyJWT, async (req, res) => {
        const email = req.params.email;
        const filter = { email: email };
        const updateDoc = {
          $set: {role: 'admin'},
        };
        const result = await userCollection.updateOne(filter, updateDoc);
        res.send(result);
      });
    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ result, token });
    });
    // This is not proper way to query multiple collection
    // After learning more about mongodb, use aggregate, lookup, pipeline, match, group
    app.get("/available", async (req, res) => {
      const date = req.query.date;
      //Step 1: get services
      const services = await servicesCollection.find().toArray();
      //Step 2: get the booking of that day
      const query = { date: date };
      const bookings = await bookingCollection.find(query).toArray();
      //Step 3: for each service, find bookings for that service
      services.forEach((service) => {
        //Step 4: find bookings for that service. output: [{},{},{}]
        const serviceBookings = bookings.filter((b) => b.treatment === service.name);
        //Step 5: select slots for the service Bookings: ['','','']
        const booked = serviceBookings.map((s) => s.slot);
        service.booked = booked;
        //service.booked = serviceBookings.map(s=>s.slot);
        //Step 6: select those slots that are not in bookedSlots
        const available = service.slots.filter((s) => !booked.includes(s));
        //service.available = available;
        //Step 7: set available to slots to make it easier;
        service.slots = available;
      });

      res.send(services);
    });
    /**
     * API Naming convention
     * app.get('/booking') //get all booking in this collection
     * app.get('/booking/:id')//get a specific booking
     * app.post('/booking')//add a new booking
     * app.patch('/booking/:id')// update
     * app.put('/booking/:id')// update if exist or insert
     * app.delete('/booking/:id')
     */
    app.get("/booking", verifyJWT, async (req, res) => {
      const patient = req.query.patient;
      const decodedEmail = req.decoded.email;
      if (patient === decodedEmail) {
        const query = { patient: patient };
        const bookings = await bookingCollection.find(query).toArray();
        return res.send(bookings);
      }
      else{
        return res.status(403).send({ message: "Forbidden access" });
      }
    });
    app.post("/booking", async (req, res) => {
      const booking = req.body;
      const query = { treatment: booking.treatment, date: booking.date, patient: booking.patient };
      const exist = await bookingCollection.findOne(query);
      if (exist) {
        return res.send({ success: false, booking: exist });
      }
      const result = await bookingCollection.insertOne(booking);
      return res.send({ success: true, result });
    });
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello from Doctors portal");
});
app.listen(port, () => {
  console.log(`Doctors app listening on port: ${port}`);
});
