import express from "express";
import ViteExpress from "vite-express";

const PORT = 3000;
const app = express();

app.get("/translate", (_, res) => {
  res.send("Hello Vite + TypeScript!");
});

app.get("^/$", (_, res) => {
  res.redirect("routes/");
})

app.get("/(routes/)?deserialize$", (_, res) => {
  res.redirect("/routes/deserialize/");
});

app.get("/(routes/)?serialize$", (_, res) => {
  res.redirect("/routes/serialize/");
})

ViteExpress.listen(app, PORT, () =>
  console.log(`Server is listening on port localhost:${PORT}...`),
);
