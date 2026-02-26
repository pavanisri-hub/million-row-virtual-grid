const fs = require("fs");
const path = require("path");

const OUTPUT_PATH = path.join(__dirname, "..", "public", "transactions.json");

const STATUSES = ["Completed", "Pending", "Failed"];
const CATEGORIES = [
  "Groceries",
  "Utilities",
  "Entertainment",
  "Travel",
  "Healthcare",
  "Shopping",
  "Dining",
  "Subscriptions",
  "Salary",
  "Investment"
];

function randomFrom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function generateTransaction(id) {
  const now = Date.now();
  const randomOffsetDays = Math.floor(Math.random() * 365);
  const date = new Date(now - randomOffsetDays * 24 * 60 * 60 * 1000);

  return {
    id,
    date: date.toISOString(),
    merchant: `Merchant ${Math.ceil(Math.random() * 5000)}`,
    category: randomFrom(CATEGORIES),
    amount: Number((Math.random() * 5000 - 1000).toFixed(2)), // allow negatives
    status: randomFrom(STATUSES),
    description: `Transaction ${id} at ${Math.random()
      .toString(36)
      .substring(2, 10)}`
  };
}

function main() {
  const total = 1_000_000;
  console.log(`Generating ${total} transactions...`);
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });

  const stream = fs.createWriteStream(OUTPUT_PATH);
  stream.write("[");

  let i = 1;

  function writeChunk() {
    let ok = true;
    while (i <= total && ok) {
      const tx = generateTransaction(i);
      const json = JSON.stringify(tx);
      if (i === 1) {
        ok = stream.write(json);
      } else {
        ok = stream.write("," + json);
      }
      if (i % 10000 === 0) {
        console.log(`Generated ${i}`);
      }
      i++;
    }
    if (i <= total) {
      stream.once("drain", writeChunk);
    } else {
      stream.write("]");
      stream.end(() => {
        console.log(`Done. Wrote ${total} records to ${OUTPUT_PATH}`);
      });
    }
  }

  writeChunk();
}

main();
