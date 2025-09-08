// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/TimeFlowVault.sol";

contract TimeFlowVaultTest is Test {
    TimeFlowVault public vault;
    
    address public owner = address(0x1);
    address public alice = address(0x2);
    address public bob = address(0x3);
    address public charlie = address(0x4);
    
    uint256 public constant INITIAL_REWARD_RATE = 100; // 100 basis points per second
    string public constant VAULT_NAME = "Test Vault";
    
    event StreamCreated(
        uint256 indexed streamId,
        address indexed sender,
        address indexed recipient,
        uint256 totalAmount,
        uint256 flowRate,
        uint256 startTime,
        uint256 stopTime,
        uint256 feeCollected
    );
    
    event Withdrawn(
        uint256 indexed streamId,
        address indexed recipient,
        uint256 amount
    );
    
    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event RewardsClaimed(address indexed user, uint256 amount);

    function setUp() public {
        vm.startPrank(owner);
        vault = new TimeFlowVault(VAULT_NAME, INITIAL_REWARD_RATE);
        vm.stopPrank();
        
        // Give test accounts some ETH
        vm.deal(alice, 100 ether);
        vm.deal(bob, 100 ether);
        vm.deal(charlie, 100 ether);
    }

    // ============ STREAMING TESTS ============
    
    function testCreateStream() public {
        uint256 streamAmount = 10 ether;
        uint256 duration = 3600; // 1 hour
        
        vm.startPrank(alice);
        
        // Calculate expected fee
        uint256 expectedFee = (streamAmount * vault.STREAMING_FEE_BPS()) / 10000;
        uint256 expectedStreamAmount = streamAmount - expectedFee;
        
        vm.expectEmit(true, true, true, true);
        emit StreamCreated(
            0, // streamId
            alice,
            bob,
            expectedStreamAmount,
            expectedStreamAmount / duration, // flowRate
            block.timestamp,
            block.timestamp + duration,
            expectedFee
        );
        
        vault.createStream{value: streamAmount}(bob, duration);
        
        // Verify stream was created
        TimeFlowVault.Stream memory stream = vault.getStream(0);
        assertEq(stream.sender, alice);
        assertEq(stream.recipient, bob);
        assertEq(stream.totalAmount, expectedStreamAmount);
        assertEq(stream.flowRate, expectedStreamAmount / duration);
        assertTrue(stream.isActive);
        
        // Verify fees were collected
        (,uint256 totalFeesCollected) = vault.getFeeInfo();
        assertEq(totalFeesCollected, expectedFee);
        
        vm.stopPrank();
    }
    
    function testCreateStreamFailsWithInvalidRecipient() public {
        vm.startPrank(alice);
        
        // Should fail with zero address
        vm.expectRevert("TimeFlowVault: Invalid recipient");
        vault.createStream{value: 1 ether}(address(0), 3600);
        
        // Should fail with self as recipient
        vm.expectRevert("TimeFlowVault: Cannot stream to self");
        vault.createStream{value: 1 ether}(alice, 3600);
        
        vm.stopPrank();
    }
    
    function testWithdrawFromStream() public {
        uint256 streamAmount = 10 ether;
        uint256 duration = 3600; // 1 hour
        
        // Create stream
        vm.prank(alice);
        vault.createStream{value: streamAmount}(bob, duration);
        
        // Fast forward 30 minutes (half the duration)
        vm.warp(block.timestamp + 1800);
        
        uint256 bobBalanceBefore = bob.balance;
        uint256 claimableBefore = vault.getClaimableBalance(0);
        
        vm.prank(bob);
        vm.expectEmit(true, true, false, true);
        emit Withdrawn(0, bob, claimableBefore);
        vault.withdrawFromStream(0);
        
        uint256 bobBalanceAfter = bob.balance;
        assertEq(bobBalanceAfter - bobBalanceBefore, claimableBefore);
        
        // Should have roughly half the stream amount (minus fees)
        uint256 expectedFee = (streamAmount * vault.STREAMING_FEE_BPS()) / 10000;
        uint256 expectedStreamAmount = streamAmount - expectedFee;
        uint256 expectedWithdrawable = expectedStreamAmount / 2;
        
        // Allow for small rounding errors
        assertApproxEqAbs(claimableBefore, expectedWithdrawable, 1);
    }
    
    function testWithdrawFromStreamFailsForNonRecipient() public {
        uint256 streamAmount = 1 ether;
        uint256 duration = 3600;
        
        // Create stream
        vm.prank(alice);
        vault.createStream{value: streamAmount}(bob, duration);
        
        // Fast forward
        vm.warp(block.timestamp + 1800);
        
        // Charlie tries to withdraw (should fail)
        vm.prank(charlie);
        vm.expectRevert("TimeFlowVault: Only recipient can withdraw");
        vault.withdrawFromStream(0);
    }
    
    function testCancelStream() public {
        uint256 streamAmount = 10 ether;
        uint256 duration = 3600;
        
        // Create stream
        vm.prank(alice);
        vault.createStream{value: streamAmount}(bob, duration);
        
        // Fast forward 30 minutes
        vm.warp(block.timestamp + 1800);
        
        uint256 aliceBalanceBefore = alice.balance;
        uint256 bobBalanceBefore = bob.balance;
        
        // Cancel stream (sender can cancel)
        vm.prank(alice);
        vault.cancelStream(0);
        
        // Check refunds were processed
        assertTrue(alice.balance > aliceBalanceBefore);
        assertTrue(bob.balance > bobBalanceBefore);
        
        // Stream should be inactive
        TimeFlowVault.Stream memory stream = vault.getStream(0);
        assertFalse(stream.isActive);
    }

    // ============ VAULT TESTS ============
    
    function testStake() public {
        uint256 stakeAmount = 5 ether;
        
        vm.prank(alice);
        vm.expectEmit(true, false, false, true);
        emit Staked(alice, stakeAmount);
        vault.stake{value: stakeAmount}();
        
        // Verify stake
        TimeFlowVault.Stake memory stake = vault.getUserStake(alice);
        assertEq(stake.amount, stakeAmount);
        assertTrue(stake.isActive);
        assertEq(stake.startTime, block.timestamp);
        
        // Verify total staked
        (uint256 totalStaked,,) = vault.getVaultStats();
        assertEq(totalStaked, stakeAmount);
    }
    
    function testStakeFailsIfAlreadyStaked() public {
        uint256 stakeAmount = 5 ether;
        
        vm.startPrank(alice);
        vault.stake{value: stakeAmount}();
        
        // Second stake should fail
        vm.expectRevert("TimeFlowVault: Already staked");
        vault.stake{value: stakeAmount}();
        
        vm.stopPrank();
    }
    
    function testUnstake() public {
        uint256 stakeAmount = 5 ether;
        uint256 unstakeAmount = 2 ether;
        
        // Stake first
        vm.prank(alice);
        vault.stake{value: stakeAmount}();
        
        uint256 aliceBalanceBefore = alice.balance;
        
        // Unstake partial amount
        vm.prank(alice);
        vm.expectEmit(true, false, false, true);
        emit Unstaked(alice, unstakeAmount);
        vault.unstake(unstakeAmount);
        
        // Verify balance returned
        assertEq(alice.balance - aliceBalanceBefore, unstakeAmount);
        
        // Verify stake updated
        TimeFlowVault.Stake memory stake = vault.getUserStake(alice);
        assertEq(stake.amount, stakeAmount - unstakeAmount);
        assertTrue(stake.isActive);
        
        // Verify total staked updated
        (uint256 totalStaked,,) = vault.getVaultStats();
        assertEq(totalStaked, stakeAmount - unstakeAmount);
    }
    
    function testUnstakeFullAmount() public {
        uint256 stakeAmount = 5 ether;
        
        // Stake first
        vm.prank(alice);
        vault.stake{value: stakeAmount}();
        
        // Unstake full amount
        vm.prank(alice);
        vault.unstake(stakeAmount);
        
        // Verify stake is inactive
        TimeFlowVault.Stake memory stake = vault.getUserStake(alice);
        assertEq(stake.amount, 0);
        assertFalse(stake.isActive);
    }
    
    function testClaimRewards() public {
        uint256 stakeAmount = 10 ether;
        
        // Create some fee revenue first by creating streams
        vm.prank(alice);
        vault.createStream{value: 5 ether}(bob, 3600);
        
        // Stake
        vm.prank(charlie);
        vault.stake{value: stakeAmount}();
        
        // Fast forward time to accumulate rewards
        vm.warp(block.timestamp + 3600); // 1 hour
        
        uint256 charlieBalanceBefore = charlie.balance;
        uint256 claimableRewards = vault.getClaimableRewards(charlie);
        
        assertTrue(claimableRewards > 0);
        
        // Claim rewards
        vm.prank(charlie);
        vm.expectEmit(true, false, false, false);
        emit RewardsClaimed(charlie, claimableRewards);
        vault.claimRewards();
        
        // Verify rewards were paid (limited by available rewards)
        uint256 actualPayout = charlie.balance - charlieBalanceBefore;
        assertTrue(actualPayout > 0);
        assertTrue(actualPayout <= claimableRewards); // May be less due to realistic rewards cap
    }
    
    function testRewardsLimitedByAvailableFunds() public {
        uint256 stakeAmount = 100 ether;
        
        // Stake large amount
        vm.prank(alice);
        vault.stake{value: stakeAmount}();
        
        // Fast forward to accumulate theoretical rewards
        vm.warp(block.timestamp + 86400); // 1 day
        
        uint256 theoreticalRewards = vault.getClaimableRewards(alice);
        uint256 realisticRewards = vault.getRealisticClaimableRewards(alice);
        
        // Realistic rewards should be capped by available funds
        (,uint256 totalRewardsAvailable,) = vault.getVaultStats();
        assertEq(realisticRewards, totalRewardsAvailable);
        assertTrue(realisticRewards < theoreticalRewards);
    }

    // ============ VIEW FUNCTION TESTS ============
    
    function testGetClaimableBalance() public {
        uint256 streamAmount = 10 ether;
        uint256 duration = 3600;
        
        vm.prank(alice);
        vault.createStream{value: streamAmount}(bob, duration);
        
        // At start, claimable should be 0
        assertEq(vault.getClaimableBalance(0), 0);
        
        // Fast forward half duration
        vm.warp(block.timestamp + duration / 2);
        
        uint256 claimable = vault.getClaimableBalance(0);
        uint256 expectedFee = (streamAmount * vault.STREAMING_FEE_BPS()) / 10000;
        uint256 expectedStreamAmount = streamAmount - expectedFee;
        
        // Should be roughly half the stream amount
        assertApproxEqAbs(claimable, expectedStreamAmount / 2, 1);
    }
    
    function testGetVaultStats() public {
        // Create fee revenue
        vm.prank(alice);
        vault.createStream{value: 1 ether}(bob, 3600);
        
        // Stake
        vm.prank(charlie);
        vault.stake{value: 5 ether}();
        
        (uint256 totalStaked, uint256 totalRewardsAvailable, uint256 rewardRate) = vault.getVaultStats();
        
        assertEq(totalStaked, 5 ether);
        assertTrue(totalRewardsAvailable > 0); // Should have some fees collected
        assertEq(rewardRate, INITIAL_REWARD_RATE);
    }

    // ============ ADMIN FUNCTION TESTS ============
    
    function testUpdateRewardRate() public {
        uint256 newRate = 200;
        
        vm.prank(owner);
        vault.updateRewardRate(newRate);
        
        (,,uint256 rewardRate) = vault.getVaultStats();
        assertEq(rewardRate, newRate);
    }
    
    function testUpdateRewardRateFailsForNonOwner() public {
        vm.prank(alice);
        vm.expectRevert();
        vault.updateRewardRate(200);
    }
    
    function testVaultPause() public {
        vm.prank(owner);
        vault.setVaultPaused(true);
        
        // Staking should fail when paused
        vm.prank(alice);
        vm.expectRevert("TimeFlowVault: Vault is paused");
        vault.stake{value: 1 ether}();
    }
    
    function testEmergencyPause() public {
        vm.prank(owner);
        vault.emergencyPause();
        
        // All vault functions should be paused
        vm.prank(alice);
        vm.expectRevert("TimeFlowVault: Vault is paused");
        vault.stake{value: 1 ether}();
    }

    // ============ EDGE CASE TESTS ============
    
    function testStreamCompletesAutomatically() public {
        uint256 streamAmount = 1 ether;
        uint256 duration = 60; // 1 minute for quick test
        
        vm.prank(alice);
        vault.createStream{value: streamAmount}(bob, duration);
        
        // Fast forward past stream end
        vm.warp(block.timestamp + duration + 1);
        
        // Withdraw all remaining funds
        vm.prank(bob);
        vault.withdrawFromStream(0);
        
        // Stream should be automatically marked as inactive
        TimeFlowVault.Stream memory stream = vault.getStream(0);
        assertFalse(stream.isActive);
    }
    
    function testMultipleStreams() public {
        uint256 streamAmount = 1 ether;
        uint256 duration = 3600;
        
        // Create multiple streams
        vm.startPrank(alice);
        vault.createStream{value: streamAmount}(bob, duration);
        vault.createStream{value: streamAmount}(charlie, duration);
        vm.stopPrank();
        
        assertEq(vault.getTotalStreams(), 2);
        
        // Both streams should be active
        assertTrue(vault.getStream(0).isActive);
        assertTrue(vault.getStream(1).isActive);
    }
    
    function testFeeCalculation() public {
        uint256 streamAmount = 10 ether; // Reduced amount to fit test account balance
        
        vm.prank(alice);
        vault.createStream{value: streamAmount}(bob, 3600);
        
        (uint256 feeBps, uint256 totalFeesCollected) = vault.getFeeInfo();
        assertEq(feeBps, 10); // 0.1%
        
        uint256 expectedFee = (streamAmount * feeBps) / 10000;
        assertEq(totalFeesCollected, expectedFee);
    }
}