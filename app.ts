const express = require("express");
const app = express();
const PORT = process.env.port || 6603;

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`);
});
