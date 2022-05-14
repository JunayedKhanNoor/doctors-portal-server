const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');
const port = process.env.PORT || 5000;

const app = express();

app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.osyjv.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;


const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run(){
    try{
        await client.connect();
        const servicesCollection = client.db("doctors_portal").collection("services");
        const bookingCollection = client.db("doctors_portal").collection("bookings");

        app.get('/service', async(req,res)=>{
            const query = {};
            const cursor = servicesCollection.find(query);
            const services = await cursor.toArray();
            res.send(services);
        })
        /**
         * API Naming convention
         * app.get('/booking') //get all booking in this collection
         * app.get('/booking/:id')//get a specific booking
         * app.post('/booking')//add a new booking
         * app.patch('/booking/:id')// update
         * app.delete('/booking/:id')
         */
        app.post('/booking', async(req,res)=>{
            const booking = req.body;
            const result = await bookingCollection.insertOne(booking);
            res.send(result);
        })
    }
    finally{

    }
}
run().catch(console.dir)


app.get('/',(req,res)=>{
    res.send('Hello from Doctors portal')
})
app.listen(port, ()=>{
    console.log(`Doctors app listening on port: ${port}`);
})