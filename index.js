require("dotenv").config();

const { KiteTicker } = require("kiteconnect");

const apiKey = process.env.KITE_API_KEY;
const accessToken = process.env.KITE_ACCESS_TOKEN;

if (!apiKey || !accessToken) {
  throw new Error(
    "Set KITE_API_KEY and KITE_ACCESS_TOKEN in .env"
  );
}

const ticker = new KiteTicker({
  api_key: apiKey,
  access_token: accessToken,
});

// Example instrument tokens:
// RELIANCE: 738561
// NIFTY 50: 256265
const tokens = [738561, 256265];

ticker.on("connect", () => {
  console.log("Connected to Zerodha WebSocket");

  ticker.subscribe(tokens);

  // MODE_LTP equivalent: ticker.modeLTP
  ticker.setMode(ticker.modeLTP, tokens);

  console.log("Subscribed to instrument tokens:", tokens);
});

ticker.on("ticks", (ticks) => {
  for (const tick of ticks) {
    console.log({
      instrumentToken: tick.instrument_token,
      lastPrice: tick.last_price,
      timestamp: new Date().toISOString(),
    });
  }
});

ticker.on("error", (error) => {
  console.error("WebSocket error:", error);
});

ticker.on("close", (reason) => {
  console.log("WebSocket closed:", reason);
});

ticker.on("disconnect", (error) => {
  console.log("WebSocket disconnected:", error);
});

// Retry dropped connections, up to 20 attempts at 5-second intervals.
ticker.autoReconnect(true, 20, 5);

ticker.on("reconnecting", (...args) => {
  console.log("Reconnecting:", ...args);
});

ticker.on("noreconnect", () => {
  console.error("Reconnect attempts exhausted");
});

ticker.connect();

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("Stopping ticker...");
  ticker.disconnect();
  process.exit(0);
});