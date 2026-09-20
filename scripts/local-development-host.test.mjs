import test from "node:test";
import assert from "node:assert/strict";
import { isLocalDevelopmentHost } from "../apps/web/lib/local-development-host.ts";

const localHosts = [
  "localhost",
  "localhost:3000",
  "LOCALHOST:3000",
  "127.0.0.1",
  "127.0.0.1:3000",
  "10.0.0.33:3000",
  "10.255.255.255",
  "192.168.1.25:3000",
  "192.168.255.255",
  "172.16.0.0",
  "172.20.10.6:3000",
  "172.31.255.255:65535",
];
const rejectedHosts = [
  "172.15.255.255",
  "172.32.0.0",
  "192.169.1.25",
  "11.0.0.33",
  "8.8.8.8:3000",
  "127.0.0.2",
  "169.254.1.1",
  "0.0.0.0",
  "10.256.0.1",
  "10.0.0",
  "10.0.0.1.2",
  "010.0.0.1",
  "10.00.0.1",
  "localhost.example.com",
  "10.0.0.33.example.com",
  "http://10.0.0.33:3000",
  "localhost:3000/path",
  "localhost:abc",
  "localhost:",
  "localhost:0",
  "localhost:65536",
  "localhost:3000\n",
  " localhost",
  "localhost ",
  "localhost,example.com",
  "localhost@example.com",
  "",
  "[::1]:3000",
];

for (const environment of ["development", "test", "production"]) {
  test(`local Host bypass is strict in ${environment}`, () => {
    const original = process.env.NODE_ENV;
    process.env.NODE_ENV = environment;
    try {
      for (const host of localHosts) {
        assert.equal(isLocalDevelopmentHost(host), environment !== "production", host);
      }
      for (const host of rejectedHosts) {
        assert.equal(isLocalDevelopmentHost(host), false, host);
      }
    } finally {
      if (original === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = original;
    }
  });
}
