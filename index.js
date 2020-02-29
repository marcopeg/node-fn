const md5 = require("md5");
const fs = require("fs-extra");
const path = require("path");
const { spawn: spawnCmd } = require("child_process");
const { deserializeError } = require("serialize-error");

const spawn = (cmd, options = {}) =>
  new Promise((resolve, reject) => {
    const tokens = cmd.split(" ");
    const { log, ...otherOptions } = options;
    let lastErrorMsg = "";

    const process = spawnCmd(tokens.shift(), tokens, otherOptions);

    if (log) {
      process.stdout.on("data", (data) => {
        log(data.toString().trim());
      });
    }

    process.stderr.on("data", (data) => {
      lastErrorMsg = data.toString().trim();
    });

    process.on("close", (code) => {
      if (code === 0) {
        resolve(code);
      } else {
        const error = new Error(lastErrorMsg);
        error.spawnCode = code;
        reject(error);
      }
    });

    process.on("error", (err) => {
      reject(err);
    });
  });

const runInDocker = async ({ name, source, dependencies, args }) => {
  const cacheId = md5(
    JSON.stringify({
      source,
      dependencies,
    })
  );
  const cachePath = path.join(__dirname, "__fn", name, cacheId);

  // DEV: clean every time
  await fs.remove(cachePath);

  // Initialize cache (dir if needed)
  const cacheExists = await fs.pathExists(cachePath);
  if (!cacheExists) {
    // -> ensure dir from the prototype folder
    await fs.copy(path.join(__dirname, "proto"), cachePath);

    // -> build package.json
    await fs.writeJson(path.join(cachePath, "package.json"), {
      name,
      dependencies: {
        ...dependencies,
        "serialize-error": "5.0.0",
      },
    });

    // -> write fn.js
    await fs.writeFile(path.join(cachePath, "fn.js"), source, "utf-8");

    // -> build docker image
    const buildExitCode = await spawn(
      `docker build -t fn__${name}:${cacheId} .`,
      {
        cwd: cachePath,
        log: console.info,
      }
    );

    if (buildExitCode !== 0) {
      throw new Error("Could noto build");
    }
  }

  // Run the script
  const envArgs = JSON.stringify(args);

  const runData = [];
  const runExitCode = await spawn(
    `docker run -e FN_ARGS=${envArgs} fn__${name}:${cacheId}`,
    {
      cwd: cachePath,
      log: (data) => runData.push(data),
    }
  );

  const runResult = runData.find(($) => $.includes("RESULT:"));
  const runError = runData.find(($) => $.includes("ERROR:"));

  // Removes the return protocol line
  runData.pop();

  if (runResult) {
    return {
      success: true,
      data: JSON.parse(runResult.substr(8)),
      process: {
        exitCode: runExitCode,
        logs: runData,
      },
    };
  } else {
    const runErrorObj = JSON.parse(runError.substr(7));
    return {
      success: false,
      error: deserializeError(runErrorObj),
      process: {
        exitCode: runExitCode,
        logs: runData,
      },
    };
  }
};

runInDocker({
  name: "fn1",
  source: `
    const express = require('express');

    module.exports = async (args) => {
      //throw new Error('fooo')
      console.log('run the function with', args);
      return {
        result: args.a + args.b * 3,
        express: typeof express
      }
    }
  `,
  dependencies: {
    express: "",
  },
  args: {
    a: 20,
    b: 30,
  },
})
  .then((res) => {
    console.log("the function executed:");
    console.info(JSON.stringify(res, null, 2));
  })
  .catch((err) => {
    console.info("there was an eerror!");
    console.error(err.message);
  });
