const md5 = require("md5");
const fs = require("fs-extra");
const path = require("path");
const spawn = require("@marcopeg/spawn");
// const spawn = require("./spawn");
const { deserializeError } = require("serialize-error");

const runInDocker = async ({ name, source, dependencies = {}, args = {} }) => {
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
    const buildProcess = await spawn(
      `docker build -t fn__${name}:${cacheId} .`,
      {
        cwd: cachePath,
        log: ($) => console.info($),
      }
    );

    if (buildProcess.code !== 0) {
      throw new Error("Could noto build");
    }
  }

  // Run the script
  const envArgs = JSON.stringify(args);

  const runData = [];
  const runProcess = await spawn(
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
    const returnStr = runResult.substr(8);
    let returnData = null;

    try {
      returnData =
        returnStr === "undefined" ? undefined : JSON.parse(returnStr);
    } catch (err) {
      throw new Error("Could not decode function return");
    }

    return {
      success: true,
      return: returnData,
      process: {
        exitCode: runProcess.code,
        logs: runData,
      },
    };
  } else {
    const runErrorObj = JSON.parse(runError.substr(7));
    runErrorObj.process = {
      exitCode: runProcess.code,
      logs: runData,
    };
    throw runErrorObj;
  }
};

runInDocker({
  name: "fn1",
  source: `
    const express = require('express');

    module.exports = async (args) => {
      // throw new Error('fooo')
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
    console.info(">>>>>>>>>>>>>>>>>>>>>> there was an error!");
    console.error(err.message);
    console.error(err.stack);
  });
