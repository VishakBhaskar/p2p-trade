// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract P2P is ReentrancyGuard {
    uint256 public totalOrders = 0;
    bool public isNative = true;
    bytes public sellerSign;
    string public sellerMessage;
    IERC20 public asset;
    address payable public immutable seller;

    mapping(uint256 => OrderStruct) private orders;
    // mapping(string => OrderStruct) private messageToOrders;

    struct OrderStruct {
        uint256 orderId;
        bytes signedMesageHash;
        bytes32 messageHash;
        string message;
        address payable buyer;
        address seller;
        bool sent;
        bool native;
        IERC20 asset;
    }

    event Action(
        uint256 orderId,
        string actionType,
        bytes messageHash,
        string message,
        address indexed executor
    );

    constructor(
        IERC20 _asset,
        bytes memory _sellerSign,
        string memory message
    ) payable {
        if (msg.value == 0 ether) {
            isNative = false;
        }
        seller = payable(msg.sender);
        asset = _asset;
        sellerSign = _sellerSign;
        sellerMessage = message;
    }

    function createOrder(
        string calldata message,
        bytes calldata signedMessage
    ) public payable returns (bool) {
        require(bytes(message).length > 0, "Message cannot be empty");
        require(bytes(signedMessage).length > 0, "Signature cannot be empty");
        require(
            isValidSignature(
                signedMessage,
                keccak256(bytes(message)),
                msg.sender
            ),
            "SignatureChecker: Invalid Buyer Signature"
        );

        uint256 orderId = totalOrders++;
        OrderStruct memory order;

        order.orderId = orderId;
        order.signedMesageHash = signedMessage;
        order.messageHash = keccak256(bytes(message));
        order.message = message;
        order.buyer = payable(msg.sender);
        order.seller = seller;
        order.sent = false;
        order.native = isNative;
        order.asset = asset;
        orders[orderId] = order;
        // messageToOrders[message] = order;

        emit Action(
            orderId,
            "ORDER CREATED",
            signedMessage,
            message,
            msg.sender
        );
        return true;
    }

    function approveOrder(uint256 _orderId) public returns (bool) {
        require(!orders[_orderId].sent, "Order has already been closed");
        require(msg.sender == seller, "Can only be approved by the seller");
        require(
            isValidSellerSignature(sellerSign, keccak256(bytes(sellerMessage))),
            "SignatureChecker: Invalid Seller Signature"
        );

        require(
            isValidSignature(
                orders[_orderId].signedMesageHash,
                orders[_orderId].messageHash,
                orders[_orderId].buyer
            ),
            "SignatureChecker: Invalid Buyer Signature"
        );

        if (isNative) {
            (bool sent, ) = orders[_orderId].buyer.call{
                value: address(this).balance
            }("");
            require(sent, "Failed to send Ether");
            orders[_orderId].sent = true;
        } else {
            require(
                asset.balanceOf(address(this)) > 0,
                "Not enough tokens in balance"
            );
            asset.transfer(
                orders[_orderId].buyer,
                asset.balanceOf(address(this))
            );
            orders[_orderId].sent = true;
        }

        emit Action(
            orders[_orderId].orderId,
            "APPROVED",
            orders[_orderId].signedMesageHash,
            orders[_orderId].message,
            msg.sender
        );

        return true;
    }

    function withdrawFunds() public returns (bool) {
        require(msg.sender == seller, "Only seller can withdraw funds");
        require(
            isValidSellerSignature(sellerSign, keccak256(bytes(sellerMessage))),
            "SignatureChecker: Invalid Seller Signature"
        );

        if (isNative) {
            (bool sent, ) = seller.call{value: address(this).balance}("");
            require(sent, "Failed to send Ether");
        } else {
            asset.transfer(seller, asset.balanceOf(address(this)));
        }

        return true;
    }

    function getOrder(
        uint256 _orderId
    ) public view returns (OrderStruct memory) {
        return orders[_orderId];
    }

    function isValidSellerSignature(
        bytes memory signature,
        bytes32 messageHash
    ) public view returns (bool) {
        bytes32 hash = MessageHashUtils.toEthSignedMessageHash(messageHash);
        return
            SignatureChecker.isValidSignatureNow(msg.sender, hash, signature);
    }

    function isValidSignature(
        bytes memory signature,
        bytes32 messageHash,
        address _signer
    ) public view returns (bool) {
        bytes32 hash = MessageHashUtils.toEthSignedMessageHash(messageHash);
        return SignatureChecker.isValidSignatureNow(_signer, hash, signature);
    }

    receive() external payable {}

    fallback() external payable {}
}
