require('dotenv').config()
const express = require('express')
const cors = require('cors')
const jwt = require('jsonwebtoken')
const cookiePaser = require('cookie-parser')
const corsOption = {
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true
}
const app = express()
const port = process.env.PORT || 5000

app.use(express.json())
app.use(cors(corsOption))
app.use(cookiePaser())


const {
  MongoClient,
  ServerApiVersion,
  ObjectId
} = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_User}:${process.env.DB_Password}@cluster0.faxnq.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

//middlewares

// const logger = async(req,res,next)=>{
//   console.log('called',req.host, req.originalUrl);
//   next()
// }

const verifyToken = async (req, res, next) => {
  const token = req.cookies?.accessToken
  console.log('ur token is ::', token);

  if (!token) {
    return res.status(401).send({
      message: 'forbidden'
    })
  }

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRETE, (err, decoded) => {
    if (err) {
      console.log(err);
      return res.status(401).send({
        message: 'ur not authorized'
      })
    }
    console.log('value in the token', decoded);
    req.user = decoded
    next()
  })

}

async function run() {
  try {

    const serviceCollection = client.db('carDoctorDB').collection('carServices')

    const bookingsCollection = client.db('carDoctorDB').collection('serviceBookings')

    //auth related api
    app.post('/jwt', (req, res) => {
      const user = req.body
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRETE, {
        expiresIn: '1h'
      })
      res
        .cookie('accessToken', token, {
          httpOnly: true,
          secure: false, //when we will use it in production then we will set it true
          sameSite: 'lax'
        })
        .send({
          success: true
        })
    })


    //service related api
    app.get('/services', async (req, res) => {

      const cursor = serviceCollection.find()
      const result = await cursor.toArray()
      res.send(result)
    })
    app.get('/services/:id', async (req, res) => {
      const findId = req.params.id
      const query = {
        service_id: findId
      }
      const result = await serviceCollection.findOne(query)
      res.send(result)
    })

    //bookings
    app.post('/serviceBooking', async (req, res) => {
      const bookingData = req.body
      const result = await bookingsCollection.insertOne(bookingData)
      res.send(result)
    })

    app.get('/serviceBooking', verifyToken, async (req, res) => {
      console.log(req.query.email);
      console.log(req.user);
      if (req.query.email !== req.user.email) {
        return res.status(403).send({
          message: 'forbidden access'
        })
      }
      let query = {}
      if (req.query?.email) {
        query = {
          "data.email": req.query.email
        }
      }
      const result = await bookingsCollection.find(query).toArray()
      res.send(result)

    })

    //delete service booking

    app.delete('/serviceBooking/:id', async (req, res) => {
      const findId = req.params.id
      const query = {
        _id: new ObjectId(findId)
      }
      const result = await bookingsCollection.deleteOne(query)
      res.send(result)
    })

    //update or patch booking


    app.patch('/serviceBooking/:id', async (req, res) => {
      const findId = req.params.id
      console.log(findId);

      const query = {
        _id: new ObjectId(findId)
      }
      const updateBooking = req.body
      console.log(updateBooking);

      const updateDoc = {
        $set: {
          status: updateBooking.status
        }
      }
      const result = await bookingsCollection.updateOne(query, updateDoc)
      res.send(result)
    })


    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('car doctor server is running')
})

app.listen(port, () => {
  console.log('listening from :', port);

})