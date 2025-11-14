const os = require("os");
const cluster = require("cluster");
const fs = require("fs");
const available_CPUS = os.cpus().length;

exports.serverClusterer = () => {
  if (cluster.isPrimary)
    for (let i = 0; i < available_CPUS; i++) {
      cluster.fork();
    }
  cluster.on("exit", (worker, code) => {
    // console.log(`Worker ${worker.process.pid} exited`);
    fs.writeFile("log.txt", "Worker exited", (err) => {
      if (err) throw err;
      cluster.fork();
    });
    fs.createWriteStream("Notes.txt", "utf-8");
  });

  fs.appendFile(
    "log.txt",
    `Worker created with number ${process.pid}\n`,
    (err) => {
      if (err) throw err;
    }
  );
};

exports.requestLogger = () => {
  return function (req, res, next) {
    try {
      fs.appendFile(
        "serverLog.txt",
        `new Client request ${new Date().toLocaleString("en-US", {
          minute: "numeric",
          day: "numeric",
        })}\n `,
        (err) => {
          if (err) throw err;
        }
      );
      next();
    } catch (error) {
      console.log(error);
    }
  };
};
