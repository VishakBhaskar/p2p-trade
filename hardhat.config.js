require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
  },
  solidity: {
    compilers: [
      {
        version: "0.8.20",
      },
      {
        version: "0.8.15",
        settings: {},
      },
    ],
  },
};
