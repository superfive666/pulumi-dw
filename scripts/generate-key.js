// eslint-disable-next-line
const { spawn } = require('child_process');
const process = require('process');
const env = process.argv[2];

console.log(env);

const keyInfo = spawn('aws ec2 create-key-pair', [
  `--key-name app-mpdw-${env}`,
  '--key-type rsa',
  '--key-format pem',
  `--profile mpdw-${env}`
]);

keyInfo.stdout.on('data', (data) => {
  const fs = require('fs');

  console.log(`Received the following key information: ${data}`);
  fs.writeFile(`app-mpdw-keyinfo-${env}.json`, data);

  const key = JSON.parse(data);

  fs.writeFile(`app-mpdw-keypair-${env}.pem`, key.KeyMaterial);
});

keyInfo.on('error', (error) => {
  console.log(`error: ${error.message}`);
});

keyInfo.stderr.on('data', (data) => {
  console.log(`stderr: ${data}`);
});

keyInfo.on('close', (code) => {
  console.log(`child process exited with code ${code}`);
});
