import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import joi from "joi";
import dayjs from "dayjs";

dotenv.config();

const participantSchema = joi.object({
    name: joi.string().required().trim()
});

const messageSchema = joi.object({
    to: joi.string().required().trim(),
    text: joi.string().required().trim(),
    type: joi.string().required().valid("message", "private_message")
});

const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;

try{
    await mongoClient.connect();
} catch (error) {
    console.log(error);
}

db = mongoClient.db("batePapoUol")

const server = express();
server.use(cors());
server.use(express.json());

server.post("/participants", async (req, res) => {
    const name = req.body.name;
    const validation = participantSchema.validate(req.body, {abortEarly: false});

    if(validation.error){
        const errors = validation.error.details.map((detail) => detail.message);
        res.status(422).send(errors);
        return;
    }

    try{
        const existingParticipant = await db.collection("participants").findOne({name: name})
        if(existingParticipant) {
            res.sendStatus(409);
            return;
        }

        await db.collection("participants").insertOne({name: name, lastStatus: Date.now()})
        await db.collection("messages").insertOne({from: name, to: "Todos", text: "entra na sala...", type: "status", time: dayjs().format("HH:mm:ss")})
        res.sendStatus(201);
    } catch (error) {
        console.log(error);
        res.sendStatus(500);
    }
})

server.get("/participants", async (req, res) => {
    try{
        const participants = await db.collection("participants").find().toArray();
        res.send(participants);
    } catch (error) {
        console.log(error);
        res.sendStatus(500);
    }
})

server.post("/messages", async (req,res) => {
    const to = req.body.to;
    const text = req.body.text;
    const type = req.body.type;
    const from = req.headers.user;
    console.log(from);
    const validation = messageSchema.validate(req.body, {abortEarly: false});

    if(validation.error){
        const errors = validation.error.details.map((detail) => detail.message);
        res.status(422).send(errors);
        return;
    }

    try{
        const existingParticipant = await db.collection("participants").findOne({name: from})

        if(!existingParticipant) {
            res.sendStatus(422);
            return;
        }

        await db.collection("messages").insertOne({from: from, to: to, text: text, type: type, time: dayjs().format("HH:mm:ss")})
        res.sendStatus(201);
    } catch (error){
        console.log(error);
        res.sendStatus(500);
    }
})

server.get("/messages", async (req, res) => {
    const limit = parseInt(req.query.limit)
    const participant = req.headers.user
    
    try{
        const messages = await db.collection("messages").find({$or: [
            {
              to: "Todos"
            },
            {
              to: participant
            },
            {
              from: participant
            }
          ]}).sort({_id: -1}).limit(limit).toArray()
          res.send(messages.reverse())
    } catch (error) {
        console.log(error);
        res.sendStatus(500);
    }
})

server.listen(5000);