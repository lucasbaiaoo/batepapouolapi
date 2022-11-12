import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import joi from "joi";
import dayjs from "dayjs";

dotenv.config();

const nameSchema = joi.object({
    name: joi.string().required().trim()
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
    const name = req.body.name
    const validation = nameSchema.validate(req.body, {abortEarly: false});

    if(validation.error){
        const errors = validation.error.details.map((detail) => detail.message);
        res.status(422).send(errors);
        return;
    }

    try{
        const existingUser = await db.collection("participants").findOne({name: name})
        if(existingUser) {
            res.sendStatus(409);
            return;
        }

        await db.collection("participants").insertOne({name: name, lastStatus: Date.now()})
        await db.collection("messages").insertOne({name: name, to: "Todos", text: "entra na sala...", type: "status", time: dayjs().format("HH:MM:SS")})
        res.sendStatus(201);
    } catch (error) {
        console.log(error);
        res.sendStatus(500);
    }
})

server.listen(5000);