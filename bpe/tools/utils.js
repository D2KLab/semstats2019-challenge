const fs = require("fs");
const path = require("path");

const walkSync = dir =>
  fs.statSync(dir).isFile()
    ? [dir]
    : fs
        .readdirSync(dir)
        .reduce(
          (files, file) =>
            fs.statSync(path.join(dir, file)).isDirectory()
              ? files.concat(walkSync(path.join(dir, file)))
              : files.concat(path.join(dir, file)),
          []
        );

module.exports = {
  walkSync
};
