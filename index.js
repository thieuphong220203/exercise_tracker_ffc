const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { format } = require('date-fns');
const mongoose = require('mongoose')
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

const app = express();

//connect to MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log('Connected error', err))

app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

const UserSchema = mongoose.Schema({
  username: String,
})

const User = mongoose.model("User", UserSchema);

const ExerciseSchema = mongoose.Schema({
  user_id: { type: String, required: true },
  description: String,
  duration: Number,
  date: Date,
});
const Exercise = mongoose.model("Exercise", ExerciseSchema);


// Create a new user
app.post('/api/users', async (req, res) => {
  console.log(req.body.username)
  const userObj = new User({
    username: req.body.username
  })

  try {
    const user = await userObj.save()
    console.log(user);
    res.json(user)
  } catch (err) {
    console.log(err);
  }
});

// Get list of all users
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}).select("_id username");
    if (users.length === 0) {
      res.status(404).send("No users found");
    } else {
      res.json(users)
    }
  } catch (err) {
    res.status(500).json({ error: 'An error occurred while retrieving users' });
  }
});

// Add exercise to a user
app.post('/api/users/:_id/exercises', async (req, res) => {
  const id = req.params._id;

  const { description, duration, date } = req.body
  
  try {
    const user = await User.findById(id)
    if (!user) {
      return res.json({ error: "Could not find user"})
    } else {
      const exerciseObj = new Exercise({
        user_id: user._id,
        description,
        duration,
        date: date ? new Date(date) : new Date()
      })
      const exercise = await exerciseObj.save()
      res.json({
        _id: user._id,
        username: user.username,
        description: exercise.description,
        duration: exercise.duration,
        date: new Date(exercise.date).toDateString()
      })
    }
  } catch (err) {
    console.log(err);
  }
});

app.get("/api/users/:_id/logs", async (req, res) => {
  const { from, to, limit } = req.query;
  const id = req.params._id;
  const user = await User.findById(id);
  if (!user) {
    res.send("Could not find user")
    return;
  }
  let dateObj = {}
  if (from) {
    dateObj["$gte"] = new Date(from)
  }
  if (to) {
    dateObj["$lte"] = new Date(to)
  }
  let filter = {
    user_id: id
  }
  if (from || to) {
    filter.date = dateObj;
  }

  const exercises = await Exercise.find(filter).limit(+limit ?? 500)

  const log = exercises.map(e => ({
    description: e.description,
    duration: e.duration,
    date: e.date.toDateString()
  }))

  res.json({
    username: user.username,
    count: exercises.length,
    _id: user._id,
    log
  })
})


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});
