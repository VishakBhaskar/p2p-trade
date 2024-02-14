# P2P Trade Contract

Using this contract, a seller can list an ERC20 token or native currency for sale. Interested buyers can create orders using the createOrder function. The signature verification of the buyer and seller happens on-chain during every transaction. The seller can approve an order and send the funds after coming to an agreement with the buyer off-chain using the approveOrder function. The tests have been written for the contract in two files - SellEther.js and SellToken.js inside the test folder. One tests the scenario when native currency is sold and the other tests for when ERC20 tokens are being sold. 

Steps to test it:
1) Clone the repository
2) Move into the folder
```shell
cd p2p-trade
```
3) Install the dependencies 
```shell
npm install
```
4) Run the tests
```shell

npx hardhat test

```

