const { spawn: spawnCmd } = require("child_process");

const pids = {};

const spawn = (cmd, options = {}) => {
  const { log, timeout, ...otherOptions } = options;
  const tokens = cmd.split(" ");
  const stdout = [];
  const stderr = [];

  const child = spawnCmd(tokens.shift(), tokens, otherOptions);

  const p = new Promise((resolve, reject) => {
    // Reference the process in the module's scope in order
    // to handle external signals (process level SIGKILL)
    pids[child.pid] = child;

    const applyReject = (err, kill) => {
      clearTimeout(__timeout);
      applyReject.called = true;
      pids[child.pid] = null;
      kill && child.kill("SIGINT");
      reject(err);
    };

    const applyResolve = (data) => {
      if (applyReject.called || applyResolve.called) {
        return;
      }

      clearTimeout(__timeout);
      applyResolve.called = true;
      pids[child.pid] = null;
      resolve(data);
    };

    const __timeout =
      timeout === undefined
        ? null
        : setTimeout(() => {
            applyReject(new Error("timeout"), true);
          }, timeout);

    child.stdout.on("data", (data) => {
      const str = data.toString().trim();
      log && log(str, data);
      stdout.push(str);
    });

    child.stderr.on("data", (data) => {
      log && log(str, data, true);
      stderr.push(data.toString().trim());
    });

    child.on("close", (code) => {
      applyResolve({
        code,
        stdout,
        stderr,
      });
    });

    child.on("error", applyReject);
    child.on("KILL", () => applyReject(new Error("killed"), true));
  });

  // Expose an API to forcefully kill the process from the outside
  p.kill = () => child.emit("KILL");

  return p;
};

const killAll = () =>
  Object.values(pids).forEach((child) => child && child.emit("KILL"));

// Attempt to kill all the registered child processes on main
// process exit
process.on("SIGINT", killAll);
process.on("exit", killAll);

module.exports = { spawn, killAll };
