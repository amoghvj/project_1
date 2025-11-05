import express from 'express';
import mongoose from 'mongoose';
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

//impots and environement

const app = express()

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';
const NODE_ENV = process.env.NODE_ENV || 'development'
const STOCKS_KEY = process.env.STOCKS_KEY
const MONGO_URI = process.env.MONGO_URI

//definition section

async function startServer() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("Atlas connected");

        app.listen(PORT, HOST, () => {
            console.log(`Server running on http://${HOST}:${PORT}`);
        });

    } catch (err) {
        console.error(" Database connection failed:", err);
        process.exit(1);

    }
}

// start server only if db connects

startServer();

app.use(express.json());

//middleware, **add cors and use of error handling middleware after, also add logging for reqs, install corresponding through npm

app.get('/', (req, res) => {
    res.json({
        status: 200,
        environment: NODE_ENV
    });

});

app.get('/stocks', async (req, res) => {
    try {
        const { symbols = "AAPL,TSLA,MSFT" } = req.query;

        // defaultly use apple, tesla and microsoft stocks

        const response = await axios.get("https://api.stockdata.org/v1/data/quote", {
            params: {
                symbols,
                api_token: STOCKS_KEY,
                key_by_ticker: true
            },
            timeout: 10000
        });

        console.log(`Fetched for ${symbols}`);

        res.json({
            requested_symbols: symbols.split(","),
            fetched_at: new Date().toISOString(),
            data: response.data?.data || response.data
        });

        /*
            use template:
            {
                query,
                timestamp,
                data
            }
        */

    } catch (error) {
        console.error("Error fetching data:", error.message);
        const status = error.response?.status || 500;

        res.status(status).json({
            error: "Failed to fetch data",
            details: error.response?.data || error.message
        });

        //replace with global error handling usng app middleware

        //  implememt shortened funnction for wrapping endpoints in the url for reqs, like app.get(url, wrapper(callback)) istead of using try cathc block repeatedly

    }
});

/*
    todo:
    split components into utils folder and paths folder
    try using Tensorflow model
    
    if not possible to train ml switch to python.

    use vercell and actually save data on cloud with atlas, instead of local mongo
*/
