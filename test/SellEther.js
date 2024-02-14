const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Sell Ether", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.

  async function sellEther() {
    const [seller, buyer1, buyer2, buyer3] = await ethers.getSigners();
    const sellerMessage = "0101";
    const sellermessageHash = ethers.id(sellerMessage);
    const sellerSignature = await seller.signMessage(
      ethers.getBytes(sellermessageHash)
    );

    const buyer1Message = "0102";
    const buyer1messageHash = ethers.id(buyer1Message);
    const buyer1Signature = await buyer1.signMessage(
      ethers.getBytes(buyer1messageHash)
    );

    const buyer2Message = "0103";
    const buyer2messageHash = ethers.id(buyer2Message);
    const buyer2Signature = await buyer2.signMessage(
      ethers.getBytes(buyer2messageHash)
    );

    const buyer3Message = "0104";
    const buyer3messageHash = ethers.id(buyer3Message);
    const buyer3Signature = await buyer3.signMessage(
      ethers.getBytes(buyer3messageHash)
    );

    // Contracts are deployed using the first signer/account by default

    // const goofytoken = await ethers.deployContract("Goofy");
    const thousandEther = ethers.parseEther("1000");
    const P2P = await ethers.getContractFactory("P2P");
    const p2p = await P2P.deploy(
      ethers.ZeroAddress,
      sellerSignature,
      sellerMessage,
      {
        value: thousandEther,
      }
    );

    // await goofytoken
    //   .connect(seller)
    //   .transfer(p2p.target, ethers.parseUnits("1000", 18));

    return {
      p2p,
      //   goofytoken,
      seller,
      buyer1,
      buyer2,
      buyer3,
      sellerMessage,
      buyer1Message,
      buyer2Message,
      buyer3Message,
      sellermessageHash,
      buyer1messageHash,
      buyer2messageHash,
      buyer3messageHash,
      sellerSignature,
      buyer1Signature,
      buyer2Signature,
      buyer3Signature,
      thousandEther,
    };
  }

  describe("Deployment", function () {
    it("Should set the right seller message, hash, signature and send ether to the contract", async function () {
      const {
        p2p,
        sellerMessage,
        sellermessageHash,
        sellerSignature,
        thousandEther,
      } = await loadFixture(sellEther);

      expect(await p2p.sellerSign()).to.equal(sellerSignature);
      expect(await p2p.sellerMessage()).to.equal(sellerMessage);
      expect(await p2p.sellerSign()).to.equal(sellerSignature);

      expect(await ethers.provider.getBalance(p2p.target)).to.equal(
        thousandEther
      );
    });

    it("Should verify seller signature", async function () {
      const { p2p, sellermessageHash, sellerSignature } = await loadFixture(
        sellEther
      );

      expect(
        await p2p.isValidSellerSignature(sellerSignature, sellermessageHash)
      ).to.equal(true);
    });
    it("Should verify buyer signature", async function () {
      const { p2p, buyer1, buyer1Signature, buyer1messageHash } =
        await loadFixture(sellEther);

      // On-Chain verification of buyer's signature
      expect(
        await p2p.isValidSignature(buyer1Signature, buyer1messageHash, buyer1)
      ).to.equal(true);
    });
  });

  describe("Create Order", function () {
    it("Should let the buyer create an order without getting reverted", async function () {
      const { p2p, buyer1Message, buyer1Signature, buyer1 } = await loadFixture(
        sellEther
      );

      expect(
        await p2p.connect(buyer1).createOrder(buyer1Message, buyer1Signature)
      ).not.to.be.reverted;
    });

    it("Should let multiple buyers create orders without getting reverted", async function () {
      const {
        p2p,
        buyer1Message,
        buyer1Signature,
        buyer1,
        buyer2Message,
        buyer2Signature,
        buyer2,
        buyer3Message,
        buyer3Signature,
        buyer3,
      } = await loadFixture(sellEther);

      expect(
        await p2p.connect(buyer1).createOrder(buyer1Message, buyer1Signature)
      ).not.to.be.reverted;

      expect(
        await p2p.connect(buyer2).createOrder(buyer2Message, buyer2Signature)
      ).not.to.be.reverted;

      expect(
        await p2p.connect(buyer3).createOrder(buyer3Message, buyer3Signature)
      ).not.to.be.reverted;
    });
  });

  describe("Approve", function () {
    it("Should let the seller approve an order without getting reverted", async function () {
      const {
        p2p,
        buyer1Message,
        buyer1Signature,
        buyer1,
        seller,
        thousandEther,
      } = await loadFixture(sellEther);

      expect(
        await p2p.connect(buyer1).createOrder(buyer1Message, buyer1Signature)
      ).not.to.be.reverted;

      // OrderId is zero because this is the first order
      expect(await p2p.connect(seller).approveOrder(0)).to.changeEtherBalances(
        [buyer1, p2p],
        [thousandEther, -thousandEther]
      );
    });

    it("Should revert if the seller tries to approve the same order twice", async function () {
      const {
        p2p,
        buyer1Message,
        buyer1Signature,
        buyer1,
        seller,
        thousandEther,
      } = await loadFixture(sellEther);

      expect(
        await p2p.connect(buyer1).createOrder(buyer1Message, buyer1Signature)
      ).not.to.be.reverted;

      expect(await p2p.connect(seller).approveOrder(0)).to.changeEtherBalances(
        [buyer1, p2p],
        [thousandEther, -thousandEther]
      );

      await expect(p2p.connect(seller).approveOrder(0)).to.be.revertedWith(
        "Order has already been closed"
      );
    });

    it("Should revert if buyer tries to approve the order", async function () {
      const { p2p, buyer1Message, buyer1Signature, buyer1 } = await loadFixture(
        sellEther
      );

      expect(
        await p2p.connect(buyer1).createOrder(buyer1Message, buyer1Signature)
      ).not.to.be.reverted;

      await expect(
        p2p.connect(buyer1).approveOrder(buyer1Message)
      ).to.be.revertedWith("Can only be approved by the seller");
    });
  });

  describe("Withdraw funds", function () {
    it("Should let the seller withdraw funds without getting reverted", async function () {
      const { p2p, seller, thousandEther } = await loadFixture(sellEther);

      expect(await p2p.connect(seller).withdrawFunds()).to.changeEtherBalances(
        [seller, p2p],
        [thousandEther, -thousandEther]
      );
    });

    it("Should revert if buyer tries to withdraw funds", async function () {
      const { p2p, seller, buyer1 } = await loadFixture(sellEther);

      await expect(p2p.connect(buyer1).withdrawFunds()).to.be.revertedWith(
        "Only seller can withdraw funds"
      );
    });
  });

  describe("Get Order details", function () {
    it("Should get order details from the message", async function () {
      const { p2p, buyer1Message, buyer1, buyer1Signature } = await loadFixture(
        sellEther
      );

      expect(
        await p2p.connect(buyer1).createOrder(buyer1Message, buyer1Signature)
      ).not.to.be.reverted;

      expect(await p2p.getOrder(buyer1Message)).not.to.be.reverted;
    });
  });

  describe("Events", function () {
    it("Should emit an event on order creation", async function () {
      const { p2p, buyer1Message, buyer1Signature, buyer1 } = await loadFixture(
        sellEther
      );

      expect(
        await p2p.connect(buyer1).createOrder(buyer1Message, buyer1Signature)
      ).not.to.be.reverted;

      await expect(
        p2p.connect(buyer1).createOrder(buyer1Message, buyer1Signature)
      )
        .to.emit(p2p, "Action")
        .withArgs(
          p2p.totalOrders(),
          "ORDER CREATED",
          buyer1Signature,
          buyer1Message,
          buyer1.address
        );
    });

    it("Should emit an event on approval", async function () {
      const { p2p, buyer1Message, buyer1Signature, buyer1, seller } =
        await loadFixture(sellEther);

      expect(
        await p2p.connect(buyer1).createOrder(buyer1Message, buyer1Signature)
      ).not.to.be.reverted;

      const order = await p2p.getOrder(buyer1Message);
      await expect(p2p.connect(seller).approveOrder(0))
        .to.emit(p2p, "Action")
        .withArgs(
          order.orderId,
          "APPROVED",
          buyer1Signature,
          buyer1Message,
          seller.address
        );
    });
  });
});
// });
