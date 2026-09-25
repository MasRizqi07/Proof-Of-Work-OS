require('dotenv').config();

const { createApp } = require('./src/app');
const { env } = require('./src/config/env');

const app = createApp();
app.listen(env.PORT, () => {
  console.log(
    `Proof of Work OS backend listening on http://localhost:${env.PORT}`,
  );
});
