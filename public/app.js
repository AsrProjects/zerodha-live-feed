const socket = io();

const tbody = document.getElementById("market-body");
const connection = document.getElementById("connection");
const lastUpdate = document.getElementById("last-update");
const watchlistCount = document.getElementById("watchlist-count");

const rows = new Map();
const prices = new Map();

const watchlist = [
  { token: 738561, symbol: "RELIANCE" },
  { token: 5633, symbol: "ACC" },
  { token: 256265, symbol: "NIFTY 50" },
];

watchlistCount.textContent = `${watchlist.length} instruments`;

function formatPrice(price) {
  return Number(price).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatTime(isoTime) {
  return new Date(isoTime).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function createRow(instrument) {
  const tr = document.createElement("tr");

  const symbol = document.createElement("td");
  symbol.className = "symbol";
  symbol.textContent = instrument.symbol;

  const token = document.createElement("td");
  token.className = "token";
  token.textContent = instrument.token;

  const price = document.createElement("td");
  price.className = "price numeric";
  price.textContent = "—";

  const time = document.createElement("td");
  time.className = "tick-time";
  time.textContent = "Waiting for tick";

  tr.append(symbol, token, price, time);

  rows.set(instrument.token, { tr, price, time });
  tbody.appendChild(tr);
}

// Display watchlist rows before the first tick arrives.
tbody.replaceChildren();
watchlist.forEach(createRow);

socket.on("connect", () => {
  console.log("Dashboard connected to server");
});

socket.on("disconnect", () => {
  setStatus(false, "Dashboard disconnected");
});

socket.on("market-status", (data) => {
  if (data.connected) {
    setStatus(true, "Market connected");
  } else {
    setStatus(false, data.message || "Market disconnected");
  }
});

function setStatus(online, label) {
  connection.className = `status ${online ? "online" : "offline"}`;
  connection.lastChild.textContent = label;
}

socket.on("market-tick", (tick) => {
  const row = rows.get(tick.token);
  if (!row) return;

  const previousPrice = prices.get(tick.token);

  row.price.textContent = `₹ ${formatPrice(tick.ltp)}`;
  row.time.textContent = formatTime(tick.receivedAt);

  row.price.style.color =
    previousPrice === undefined || tick.ltp === previousPrice
      ? "#e5e7eb"
      : tick.ltp > previousPrice
        ? "#34d399"
        : "#f87171";

  prices.set(tick.token, tick.ltp);
  lastUpdate.textContent = formatTime(tick.receivedAt);
});