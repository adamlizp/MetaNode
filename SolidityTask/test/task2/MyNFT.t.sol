// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {Test, console2} from "forge-std/Test.sol";
import {MyNFT} from "src/task2/MyNFT.sol";

contract MyNFTTest is Test {
    MyNFT public nft;
    address public owner;
    address public user1;
    address public user2;

    string constant NAME = "MyAwesomeNFT";
    string constant SYMBOL = "MANFT";
    string constant TOKEN_URI_1 = "https://ipfs.io/ipfs/QmTest1";
    string constant TOKEN_URI_2 = "https://ipfs.io/ipfs/QmTest2";

    event NFTMinted(
        address indexed to,
        uint256 indexed tokenId,
        string tokenURI
    );
    event BatchMinted(
        address indexed to,
        uint256 startTokenId,
        uint256 quantity
    );

    function setUp() public {
        owner = address(this);
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");

        nft = new MyNFT(NAME, SYMBOL);
    }

    function testContractDeployment() public {
        assertEq(nft.name(), NAME);
        assertEq(nft.symbol(), SYMBOL);
        assertEq(nft.owner(), owner);
        assertEq(nft.getNextTokenId(), 1);
        assertEq(nft.getTotalSupply(), 0);
    }

    function testMintNFT() public {
        // 测试铸造NFT
        vm.expectEmit(true, true, false, true);
        emit NFTMinted(user1, 1, TOKEN_URI_1);

        uint256 tokenId = nft.mintNFT(user1, TOKEN_URI_1);

        assertEq(tokenId, 1);
        assertEq(nft.ownerOf(tokenId), user1);
        assertEq(nft.tokenURI(tokenId), TOKEN_URI_1);
        assertEq(nft.balanceOf(user1), 1);
        assertEq(nft.getTotalSupply(), 1);
        assertEq(nft.getNextTokenId(), 2);
        assertTrue(nft.exists(tokenId));
    }

    function testMintMultipleNFTs() public {
        // 铸造第一个NFT
        uint256 tokenId1 = nft.mintNFT(user1, TOKEN_URI_1);

        // 铸造第二个NFT给不同用户
        uint256 tokenId2 = nft.mintNFT(user2, TOKEN_URI_2);

        assertEq(tokenId1, 1);
        assertEq(tokenId2, 2);
        assertEq(nft.ownerOf(tokenId1), user1);
        assertEq(nft.ownerOf(tokenId2), user2);
        assertEq(nft.balanceOf(user1), 1);
        assertEq(nft.balanceOf(user2), 1);
        assertEq(nft.getTotalSupply(), 2);
    }

    function testBatchMint() public {
        string[] memory tokenURIs = new string[](3);
        tokenURIs[0] = "https://ipfs.io/ipfs/QmBatch1";
        tokenURIs[1] = "https://ipfs.io/ipfs/QmBatch2";
        tokenURIs[2] = "https://ipfs.io/ipfs/QmBatch3";

        vm.expectEmit(true, false, false, true);
        emit BatchMinted(user1, 1, 3);

        uint256[] memory tokenIds = nft.batchMintNFT(user1, tokenURIs);

        assertEq(tokenIds.length, 3);
        assertEq(tokenIds[0], 1);
        assertEq(tokenIds[1], 2);
        assertEq(tokenIds[2], 3);

        assertEq(nft.balanceOf(user1), 3);
        assertEq(nft.getTotalSupply(), 3);

        for (uint256 i = 0; i < tokenIds.length; i++) {
            assertEq(nft.ownerOf(tokenIds[i]), user1);
            assertEq(nft.tokenURI(tokenIds[i]), tokenURIs[i]);
        }
    }

    function testTokensOfOwner() public {
        // 给user1铸造3个NFT
        nft.mintNFT(user1, TOKEN_URI_1);
        nft.mintNFT(user2, TOKEN_URI_2);
        nft.mintNFT(user1, TOKEN_URI_1);
        nft.mintNFT(user1, TOKEN_URI_2);

        uint256[] memory user1Tokens = nft.tokensOfOwner(user1);
        uint256[] memory user2Tokens = nft.tokensOfOwner(user2);

        assertEq(user1Tokens.length, 3);
        assertEq(user2Tokens.length, 1);

        assertEq(user1Tokens[0], 1);
        assertEq(user1Tokens[1], 3);
        assertEq(user1Tokens[2], 4);
        assertEq(user2Tokens[0], 2);
    }

    function testOnlyOwnerCanMint() public {
        // 非所有者尝试铸造应该失败
        vm.prank(user1);
        vm.expectRevert();
        nft.mintNFT(user1, TOKEN_URI_1);

        // 所有者可以成功铸造
        uint256 tokenId = nft.mintNFT(user1, TOKEN_URI_1);
        assertEq(tokenId, 1);
    }

    function testMintToZeroAddress() public {
        vm.expectRevert("MyNFT: mint to zero address");
        nft.mintNFT(address(0), TOKEN_URI_1);
    }

    function testMintWithEmptyURI() public {
        vm.expectRevert("MyNFT: tokenURI cannot be empty");
        nft.mintNFT(user1, "");
    }

    function testBatchMintLimits() public {
        // 测试空数组
        string[] memory emptyURIs = new string[](0);
        vm.expectRevert("MyNFT: tokenURIs array cannot be empty");
        nft.batchMintNFT(user1, emptyURIs);

        // 测试超过限制
        string[] memory tooManyURIs = new string[](51);
        for (uint256 i = 0; i < 51; i++) {
            tooManyURIs[i] = "https://ipfs.io/ipfs/QmTest";
        }
        vm.expectRevert("MyNFT: cannot mint more than 50 NFTs at once");
        nft.batchMintNFT(user1, tooManyURIs);

        // 测试包含空URI
        string[] memory urisWithEmpty = new string[](2);
        urisWithEmpty[0] = TOKEN_URI_1;
        urisWithEmpty[1] = "";
        vm.expectRevert("MyNFT: tokenURI cannot be empty");
        nft.batchMintNFT(user1, urisWithEmpty);
    }

    function testSupportsInterface() public {
        // ERC721
        assertTrue(nft.supportsInterface(0x80ac58cd));
        // ERC721Metadata
        assertTrue(nft.supportsInterface(0x5b5e139f));
        // ERC165
        assertTrue(nft.supportsInterface(0x01ffc9a7));
    }

    function testTokensOfOwnerWithZeroAddress() public {
        vm.expectRevert("MyNFT: query for zero address");
        nft.tokensOfOwner(address(0));
    }

    function testTokensOfOwnerWithNoTokens() public {
        uint256[] memory tokens = nft.tokensOfOwner(user1);
        assertEq(tokens.length, 0);
    }

    function testExistsFunction() public {
        assertFalse(nft.exists(1));

        nft.mintNFT(user1, TOKEN_URI_1);
        assertTrue(nft.exists(1));
        assertFalse(nft.exists(2));
    }
}
