const { serializeError } = require("serialize-error");
const fn = require("./fn.js");

fn(JSON.parse(process.env.FN_ARGS))
  .then((result) => {
    process.stdout.write(`RESULT: ${JSON.stringify(result)}`);
    process.exit(0);
  })
  .catch((error) => {
    process.stdout.write(`ERROR: ${JSON.stringify(serializeError(error))}`);
    process.exit(0);
  });
