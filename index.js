require("dotenv").config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { KiteTicker } = require("kiteconnect");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 3000;

const apiKey = process.env.KITE_API_KEY;
const accessToken = process.env.KITE_ACCESS_TOKEN;

if (!apiKey || !accessToken) {
  throw new Error("Missing API key or access token in .env");
}

app.use(express.static("public"));

const ticker = new KiteTicker({
  api_key: apiKey,
  access_token: accessToken,
});

// Example instrument tokens
const instruments = [
  { token: 738561, symbol: "RELIANCE" },
  { token: 5633, symbol: "ACC" },
  { token: 256265, symbol: "NIFTY 50" },
];

const symbolByToken = new Map(
  instruments.map((item) => [item.token, item.symbol])
);

const latestTicks = new Map();

ticker.on("connect", () => {
  console.log("Connected to Zerodha WebSocket");

  const tokens = instruments.map((item) => item.token);

  ticker.subscribe(tokens);
  ticker.setMode(ticker.modeLTP, tokens);

  io.emit("market-status", { connected: true });
});

ticker.on("ticks", (ticks) => {
  for (const tick of ticks) {
    const symbol = symbolByToken.get(tick.instrument_token);

    if (!symbol) continue;

    const row = {
      token: tick.instrument_token,
      symbol,
      ltp: tick.last_price,
      exchangeTimestamp: tick.exchange_timestamp
        ? new Date(tick.exchange_timestamp).toISOString()
        : null,
      receivedAt: new Date().toISOString(),
    };

    latestTicks.set(tick.instrument_token, row);
    io.emit("market-tick", row);
  }
});

ticker.on("error", (error) => {
  console.error("KiteTicker error:", error);
});

ticker.on("disconnect", (error) => {
  console.log("Zerodha disconnected:", error || "");
  io.emit("market-status", { connected: false });
});

ticker.on("close", () => {
  io.emit("market-status", { connected: false });
});

ticker.on("reconnecting", () => {
  io.emit("market-status", { connected: false });
});

ticker.on("noreconnect", () => {
  console.error("Automatic reconnection exhausted");
});

ticker.autoReconnect(true, 20, 5);

io.on("connection", (socket) => {
  socket.emit("market-status", {
    connected: false,
    message: "Waiting for market connection",
  });

  // Send the latest available prices to newly opened dashboards.
  for (const row of latestTicks.values()) {
    socket.emit("market-tick", row);
  }
});

server.listen(PORT, () => {
  console.log(`Dashboard: http://localhost:${PORT}`);
  ticker.connect();
});

process.on("SIGINT", () => {
  console.log("Shutting down...");
  ticker.disconnect();
  server.close(() => process.exit(0));
});