import express from 'express';
import mongoose, { models } from 'mongoose';
import axios from 'axios';
import dotenv from 'dotenv';
import { StockTrend, parseStock, loss, optimizer } from './model';
dotenv.config();

//impots and environement

const stock_models = {};
const resolved_loss = {};

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

app.get('/predict', async (req, res) => {
    const { symbol = "TSLA", timestamp } = req.query;
    const time = timestamp ? new Date(timestamp) : new Date().toISOString();

    if (resolved_loss.hasOwnProperty(symbol)) await resolved_loss[symbol]

    res.json({
        requested_symbol: symbol,
        fetched_at: new Date().toISOString(),
        data: {
            timestamp,
            price: await stock_models[symbol].predict(time)
        }
    });

});

app.get('/current', async (req, res) => {
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

        console.log(response.data.data)

        for (const symbol in response.data.data) {
            const processed = parseStock(response.data.data[symbol]);

            if (resolved_loss.hasOwnProperty(symbol)) await resolved_loss[symbol]

            if (!stock_models.hasOwnProperty(symbol)) {
                resolved_loss[symbol] = (async () => {
                    stock_models[symbol] = new StockTrend(processed);
                    stock_models[symbol].compile({ loss, optimizer });

                    return 0;
                })();

                continue;
            }

            resolved_loss[symbol] = stock_models[symbol].fit(processed);

            // let curr = (new Date(response.data.data[symbol].last_trade_time)).getTime();

            // if (memo[symbol].time >= curr) {
            //     memo[symbol].prev = response.data.data[symbol].price
            //     memo[symbol].a = Math.max(memo[symbol].a + curr - memo[symbol].time, 0)
            //     memo[symbol].time = curr

            // } else {
            //     let b = curr - memo[symbol].time;
            //     let new_slope = (response.data.data[symbol].price - memo[symbol].prev) / b;
            //     console.log(`stock: ${symbol}, new: ${response.data.data[symbol].price}, old: ${memo[symbol].prev}, now: ${curr}, prev: ${memo[symbol].time}, old_slope: ${memo[symbol].slope}, new_slope: ${new_slope}`);
            //     memo[symbol].prev = response.data.data[symbol].price
            //     memo[symbol].slope = (memo[symbol].a * memo[symbol].slope + b * new_slope) / (memo[symbol].a + b);
            //     memo[symbol].a += b
            //     memo[symbol].time = curr

            // }
            // response.data.data[symbol] = response.data.data[symbol].price
            // console.log(symbol)
        }

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
