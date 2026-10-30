import express from "express";
import cors from "cors";
import routes from "./src/routes/index";
import { errorHandler } from "./src/middlewares/index";
import { env } from "./src/config/index";
import { initCronJobs } from "./src/jobs/cron_jobs";

const app = express();

app.use(
  cors({
    origin: "*",
    allowedHeaders: "*",
    methods: "*",
  })
);

app.use(express.json());

app.get("/health", (req, res) => {
  return res.json({ status: "ok" });
});

app.use("/api", routes);

app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`Server running in ${env.NODE_ENV} mode on port ${env.PORT}`);
  initCronJobs();
});