const { spawn, killAll } = require("./spawn");

describe("spawn", () => {
  it("should be a function", () => {
    expect(typeof spawn).toBe("function");
  });

  it("should run a local command and catch standard output", async () => {
    const res = await spawn("echo 123");
    expect(res.code).toBe(0);
    expect(res.stdout[0]).toBe("123");
    expect(res.stderr.length).toBe(0);
  });

  it("should run commands in a specific cwd", async () => {
    const res = await spawn("pwd", { cwd: __dirname });
    expect(res.stdout[0]).toBe(__dirname);
  });

  it("should run a local command and catch standard error and output", async () => {
    const res = await spawn("./spawn.cmd1.sh", { cwd: __dirname });
    expect(res.stdout[0]).toBe("msg1");
    expect(res.stderr[0]).toBe("msg2");
  });

  it("should collect live logs during the execution of a command", async () => {
    const log = jest.fn();
    const res = await spawn("yarn --help", { log });
    expect(log.mock.calls.length).toBeGreaterThan(1);
    expect(res.stdout.length).toBe(4);
  });

  it("should accept arguments and pass them to the script", async () => {
    const res = await spawn("./spawn.cmd2.sh 0", { cwd: __dirname });
    expect(res.stdout[0]).toBe("delay: 0");
  });

  it("should interrupt a running task with a timeout", async () => {
    const log = jest.fn((e) => console.log);
    try {
      await spawn("./spawn.cmd2.sh 1", { cwd: __dirname, timeout: 100 });
    } catch (err) {
      log(err);
    }
    expect(log.mock.calls.length).toBe(1);
  });

  it("should kill all running processes", async () => {
    const p1 = spawn("pwd", { cwd: __dirname });
    const p2 = spawn("./spawn.cmd2.sh 2", { cwd: __dirname });

    // simulate an exteral kill
    await new Promise((resolve) =>
      setTimeout(() => {
        killAll();
        resolve();
      }, 10)
    );

    // First process should complete
    const p1Res = await p1;
    expect(p1Res.stdout[0]).toBe(__dirname);

    // Second process should reject due to the killall
    const p2Res = jest.fn();
    try {
      await p2;
    } catch (err) {
      p2Res(err.message);
    }
    expect(p2Res).toHaveBeenCalledWith("killed");
  });

  it("should be possible to kill a running child process", async () => {
    const p1 = spawn("./spawn.cmd2.sh 2", {
      cwd: __dirname,
    });

    // kill the process while it is executing
    await new Promise((resolve) =>
      setTimeout(() => {
        p1.kill();
        resolve();
      }, 10)
    );

    // Second process should reject due to the killall
    const p1Res = jest.fn();
    try {
      await p1;
    } catch (err) {
      p1Res(err.message);
    }
    expect(p1Res).toHaveBeenCalledWith("killed");
  });
});
