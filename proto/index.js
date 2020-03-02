const { serializeError } = require("serialize-error");

// Dynamic import is needed to handle syntax errors in the codebase
let fn = null;
try {
  fn = require("./fn.js");
} catch (error) {
  // console.log("fooooooo");
  // process.stdout.write(error.toString());
  // process.stdout.write(error.stack);
  process.stdout.write(`ERROR: ${JSON.stringify(serializeError(error))}`);
  process.exit(-1);
}

let args = {};
try {
  args = JSON.parse(process.env.FN_ARGS);
} catch (err) {}

fn(args)
  .then((result) => {
    process.stdout.write(`RESULT: ${JSON.stringify(result)}`);
    process.exit(0);
  })
  .catch((error) => {
    // process.stdout.write("RESULT: foooo");
    process.stdout.write(`ERROR: ${JSON.stringify(serializeError(error))}`);
    process.exit(-1);
  });
