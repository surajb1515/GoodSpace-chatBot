
require("dotenv").config();
const express = require("express");
const http = require("http");
const path = require('path');
const mongoose = require('mongoose');
const socketIO = require("socket.io");
const { Configuration, OpenAIApi } = require("openai");
const { MongoClient } = require('mongodb');




const app = express();
const server = http.createServer(app);
const io = socketIO(server);
const port = process.env.PORT || 3000;

// const url = "mongodb://localhost:27017/chatbot"
const url = process.env.MONGO_URL
mongoose.connect(url);






// creating a conversation schema
// it can be created in a new file
const conversationSchema = {
  role: String,
  msg: String,
}


const Conver = mongoose.model("convers", conversationSchema)






// OpenAI API configuration
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));




// fetch request to req the conversation data from the database
app.get('/fetch', async (req, res) => {
  try {
    const data = await Conver.find({});
    res.render('index', { data }); // render the 'index' view and pass the data
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).send('Internal Server Error');
  }
});



io.on("connection", async (socket) => {
  
  console.log(`New user ki id hai ${socket.id}`);

  
  const conversationHistory = [];




  

  // EVENTS ###################-----> 

  socket.on("user-msg-send-kia", async (message, callback) => {
    try {

      // Add the user message to the conversation history
      conversationHistory.push({
        role: "user",
        content: message
      });

      const useMsg = new Conver({
        role: "user",
        msg: message
      })

      const saveduserMsg = await useMsg.save()

      // console.log(conversationHistory)


      const completion = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: conversationHistory,
      });

      const response = completion.data.choices[0].message.content;


      // Add the GPT response to the conversation history
      conversationHistory.push({
        role: "assistant",
        content: response
      });

      const gptMsg = new Conver({
        role: "chatBot",
        msg: response
      })

      const savedgptMsg = await gptMsg.save()

      // console.log(conversationHistory)


      socket.emit("message", response);
      callback();


      const client = new MongoClient(url);
      const database = client.db('test');
      const collection = database.collection('convers');

      console.log(collection)



    } catch (error) {
      console.error(error);
      callback("Error: Unable to connect to the chatbot");
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });

});

server.listen(port, () => console.log("Server is running on port http://localhost:3000"));
