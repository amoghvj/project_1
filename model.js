class StockTrend {
    constructor({ symbol, y_true, last_trade_time }) {
        this.symbol = symbol;
        this.last_price = y_true;
        this.last_time = new Date(last_trade_time);
        this.created_at = new Date(last_trade_time);
        this.price_created = y_true;

        this.slope = 0;

        this.history = [];
        this.loss_func = null;
        this.optimizer = null;

    }

    compile({ loss, optimizer }) {
        this.loss_func = loss;
        this.optimizer = optimizer;

        return this;
    }

    predictFromCreation(t) {
        const dt = (t - this.created_at);

        return this.price_created + this.slope * dt;
    }

    predict(timestamp) {
        return this.last_price + this.slope * (new Date(timestamp) - this.last_time)
    }

    async fit({ y_true, last_trade_time }) {
        const t = new Date(last_trade_time)

        const y_pred = await this.predict(t);

        const loss = await this.loss_func(this, y_true, y_pred);

        const deltaT = (t - this.last_time) / 1000;

        if (deltaT === 0) return loss;

        const gradient = (y_pred - y_true) * deltaT;

        this.slope = await this.optimizer(this, this.slope, gradient)

        this.last_price = y_true;
        this.last_time = t;
        this.history.push({ t, loss, slope: this.slope });

        return loss;
    }

    async evaluate({ y_true, last_trade_time }) {
        const t = new Date(last_trade_time);
        const y_pred_anchor = await this.predictFromCreation(t);

        return await this.loss_func(this, y_true, y_pred_anchor);
    }

}

function parseStock(data) {
    return {
        symbol: data.ticker,
        y_true: data.price,
        last_trade_time: data.last_trade_time
    }
}

async function loss(model, y_true, y_pred) {
    return (y_true - y_pred) ** 2;
}

async function optimizer(model, slope, grad) {
    const lr = 0.001;
    return slope - lr * grad;
}

export { StockTrend, parseStock, loss, optimizer };