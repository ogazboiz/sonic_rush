// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title SonicRush Activity-Based
 * @dev Streaming protocol where rewards are based on streaming activity
 * 
 * KEY FEATURES:
 * 1. No activity = No rewards
 * 2. Time rewards scale with streaming activity
 * 3. Streaming rewards from fees
 * 4. APY capped at 100% for sustainability
 * 5. Excess funds distributed: 50% owner, 30% charity, 20% stakers
 */
contract SonicRushActivityBased {
    // ============ ACCESS CONTROL ============
    
    address public owner;
    address public charityAddress;
    bool private _locked;
    
    modifier onlyOwner() {
        require(msg.sender == owner, "SonicRush: Not the owner");
        _;
    }
    
    modifier nonReentrant() {
        require(!_locked, "SonicRush: Reentrant call");
        _locked = true;
        _;
        _locked = false;
    }

    // ============ STREAMING FEATURES ============
    
    struct Stream {
        address sender;
        address recipient;
        uint256 totalAmount;
        uint256 flowRate;
        uint256 startTime;
        uint256 stopTime;
        uint256 amountWithdrawn;
        bool isActive;
    }

    mapping(uint256 => Stream) public streams;
    uint256 public nextStreamId;
    
    // Streaming fee (0.1% = 10 basis points)
    uint256 public constant STREAMING_FEE_BPS = 10;
    
    // Revenue split (adjustable by owner)
    uint256 public stakerShareBPS = 4000; // 40%
    uint256 public ownerShareBPS = 6000;  // 60%
    
    // APY cap (adjustable by owner)
    uint256 public apyCapBPS = 4000; // 40%
    
    // ============ ACTIVITY TRACKING ============
    
    // Track streaming activity for time-based rewards
    uint256 public totalStreamVolume24h; // Total volume in last 24 hours
    uint256 public lastActivityUpdate;   // Last time activity was updated
    uint256 public constant ACTIVITY_WINDOW = 24 hours;
    
    // ============ VAULT FEATURES ============
    
    string public vaultName;
    uint256 public totalStaked;
    uint256 public totalRewardsAvailable;
    uint256 public lastUpdateTime;
    uint256 public baseRewardRate; // Base time reward rate (basis points per hour)
    bool public vaultActive;
    
    struct Stake {
        uint256 amount;
        uint256 startTime;
        uint256 lastClaimTime;
        uint256 accumulatedRewards;
        bool isActive;
    }

    mapping(address => Stake) public stakes;
    mapping(address => uint256) public userRewards;
    
    // Revenue tracking
    uint256 public ownerRevenue;
    uint256 public charityFunds;

    // ============ EVENTS ============
    
    event StreamCreated(
        uint256 indexed streamId,
        address indexed sender,
        address indexed recipient,
        uint256 totalAmount,
        uint256 flowRate,
        uint256 startTime,
        uint256 stopTime,
        uint256 feeCollected,
        uint256 stakerShare,
        uint256 ownerShare
    );
    
    event Withdrawn(
        uint256 indexed streamId,
        address indexed recipient,
        uint256 amount
    );
    
    event StreamCancelled(
        uint256 indexed streamId,
        address indexed sender,
        address indexed recipient,
        uint256 senderBalance,
        uint256 recipientBalance
    );
    
    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event RewardsClaimed(address indexed user, uint256 amount);
    event ExcessFundsDistributed(uint256 totalExcess, uint256 ownerShare, uint256 charityShare, uint256 stakerBonus);
    event OwnerRevenueWithdrawn(address indexed owner, uint256 amount);
    event CharityFundsWithdrawn(address indexed charity, uint256 amount);

    // ============ CONSTRUCTOR ============
    
    constructor(
        string memory _vaultName,
        uint256 _baseRewardRate,
        address _charityAddress
    ) {
        require(_charityAddress != address(0), "SonicRush: Invalid charity address");
        require(_charityAddress != msg.sender, "SonicRush: Charity cannot be owner");

        owner = msg.sender;
        charityAddress = _charityAddress;
        vaultName = _vaultName;
        baseRewardRate = _baseRewardRate; // Basis points per hour
        vaultActive = true;
        lastUpdateTime = block.timestamp;
        lastActivityUpdate = block.timestamp;
    }

    // ============ STREAMING FUNCTIONS ============
    
    function createStream(address recipient, uint256 duration) external payable {
        require(recipient != address(0), "SonicRush: Invalid recipient");
        require(recipient != msg.sender, "SonicRush: Cannot stream to self");
        require(duration > 0, "SonicRush: Duration must be positive");
        require(msg.value > 0, "SonicRush: Amount must be positive");

        uint256 fee = (msg.value * STREAMING_FEE_BPS) / 10000;
        uint256 streamAmount = msg.value - fee;
        
        // Calculate flow rate
        uint256 flowRate = streamAmount / duration;
        
        // Create stream
        streams[nextStreamId] = Stream({
            sender: msg.sender,
            recipient: recipient,
            totalAmount: streamAmount,
            flowRate: flowRate,
            startTime: block.timestamp,
            stopTime: block.timestamp + duration,
            amountWithdrawn: 0,
            isActive: true
        });

        // Update activity tracking
        _updateActivity(msg.value);

        // Distribute fees
        uint256 stakerShare = (fee * stakerShareBPS) / 10000;
        uint256 ownerShare = (fee * ownerShareBPS) / 10000;
        
        totalRewardsAvailable += stakerShare;
        ownerRevenue += ownerShare;

        emit StreamCreated(
            nextStreamId,
            msg.sender,
            recipient,
            streamAmount,
            flowRate,
            block.timestamp,
            block.timestamp + duration,
            fee,
            stakerShare,
            ownerShare
        );

        nextStreamId++;
    }
    
    function withdrawFromStream(uint256 streamId) external nonReentrant {
        Stream storage stream = streams[streamId];
        require(stream.isActive, "SonicRush: Stream not active");
        require(msg.sender == stream.recipient, "SonicRush: Only recipient can withdraw");

        uint256 claimableAmount = getClaimableBalance(streamId);
        require(claimableAmount > 0, "SonicRush: No funds to withdraw");

        stream.amountWithdrawn += claimableAmount;
        
        if (stream.amountWithdrawn >= stream.totalAmount) {
            stream.isActive = false;
        }

        (bool success, ) = msg.sender.call{value: claimableAmount}("");
        require(success, "SonicRush: Transfer failed");

        emit Withdrawn(streamId, msg.sender, claimableAmount);
    }
    
    function cancelStream(uint256 streamId) external nonReentrant {
        Stream storage stream = streams[streamId];
        require(stream.isActive, "SonicRush: Stream not active");
        require(msg.sender == stream.sender, "SonicRush: Only sender can cancel");

        uint256 claimableAmount = getClaimableBalance(streamId);
        uint256 senderBalance = stream.totalAmount - stream.amountWithdrawn - claimableAmount;

        stream.isActive = false;

        if (claimableAmount > 0) {
            (bool success, ) = stream.recipient.call{value: claimableAmount}("");
            require(success, "SonicRush: Transfer failed");
        }

        if (senderBalance > 0) {
            (bool success, ) = msg.sender.call{value: senderBalance}("");
            require(success, "SonicRush: Transfer failed");
        }

        emit StreamCancelled(streamId, msg.sender, stream.recipient, senderBalance, claimableAmount);
    }
    
    function getClaimableBalance(uint256 streamId) public view returns (uint256) {
        Stream memory stream = streams[streamId];
        if (!stream.isActive) return 0;
        
        uint256 currentTime = block.timestamp;
        if (currentTime <= stream.startTime) return 0;
        
        uint256 elapsedTime = currentTime - stream.startTime;
        uint256 totalClaimable = elapsedTime * stream.flowRate;
        
        if (totalClaimable > stream.totalAmount) {
            totalClaimable = stream.totalAmount;
        }
        
        return totalClaimable - stream.amountWithdrawn;
    }

    // ============ STAKING FUNCTIONS ============
    
    function stake() external payable nonReentrant {
        require(vaultActive, "SonicRush: Vault is paused");
        require(msg.value > 0, "SonicRush: Amount must be positive");
        require(!stakes[msg.sender].isActive, "SonicRush: Already staked");

        stakes[msg.sender] = Stake({
            amount: msg.value,
            startTime: block.timestamp,
            lastClaimTime: block.timestamp,
            accumulatedRewards: 0,
            isActive: true
        });

        totalStaked += msg.value;
        lastUpdateTime = block.timestamp;

        emit Staked(msg.sender, msg.value);
    }
    
    function unstake(uint256 amount) external nonReentrant {
        require(vaultActive, "SonicRush: Vault is paused");
        require(amount > 0, "SonicRush: Amount must be positive");
        
        Stake storage userStake = stakes[msg.sender];
        require(userStake.isActive, "SonicRush: No active stake");
        require(amount <= userStake.amount, "SonicRush: Insufficient staked amount");

        // Update rewards before unstaking
        _updateUserRewards(msg.sender);

        userStake.amount -= amount;
        totalStaked -= amount;

        if (userStake.amount == 0) {
            userStake.isActive = false;
        }

        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "SonicRush: Transfer failed");

        emit Unstaked(msg.sender, amount);
    }
    
    function claimRewards() external nonReentrant {
        require(vaultActive, "SonicRush: Vault is paused");
        require(stakes[msg.sender].isActive, "SonicRush: No active stake");

        _updateUserRewards(msg.sender);
        
        uint256 rewards = userRewards[msg.sender];
        require(rewards > 0, "SonicRush: No rewards available to claim");
        
        // Make sure we don't exceed available rewards and contract balance
        uint256 availableRewards = totalRewardsAvailable;
        uint256 contractBalance = address(this).balance;
        uint256 maxClaimable = contractBalance > totalStaked ? contractBalance - totalStaked : 0;
        
        if (rewards > availableRewards) rewards = availableRewards;
        if (rewards > maxClaimable) rewards = maxClaimable;
        
        require(rewards > 0, "SonicRush: No rewards available to claim");

        userRewards[msg.sender] -= rewards;
        if (totalRewardsAvailable >= rewards) {
            totalRewardsAvailable -= rewards;
        }

        (bool success, ) = msg.sender.call{value: rewards}("");
        require(success, "SonicRush: Transfer failed");

        emit RewardsClaimed(msg.sender, rewards);
    }

    // ============ REWARD CALCULATION ============
    
    function _updateUserRewards(address user) internal {
        Stake storage userStake = stakes[user];
        if (!userStake.isActive) return;

        // Calculate time-based rewards (only if there's activity)
        uint256 timeBasedRewards = _calculateTimeBasedRewards(user);
        
        // For this simplified version, we only use time-based rewards
        // Fee-based rewards are distributed via the totalRewardsAvailable pool
        
        if (timeBasedRewards > 0) {
            userRewards[user] += timeBasedRewards;
            userStake.accumulatedRewards += timeBasedRewards;
        }
        
        userStake.lastClaimTime = block.timestamp;
    }
    
    function _calculateTimeBasedRewards(address user) internal view returns (uint256) {
        // Only give time-based rewards if there's been activity
        if (totalStreamVolume24h == 0) return 0;
        
        Stake memory userStake = stakes[user];
        uint256 timeElapsed = block.timestamp - userStake.lastClaimTime;
        
        // Calculate activity scaling factor
        uint256 scalingFactor = _getActivityScalingFactor();
        
        // Base time reward
        uint256 baseReward = (userStake.amount * baseRewardRate * timeElapsed) / (10000 * 3600);
        
        // Scale by activity
        return (baseReward * scalingFactor) / 100;
    }
    
    function _calculateFeeBasedRewards(address user) internal view returns (uint256) {
        if (totalStaked == 0 || totalRewardsAvailable == 0) return 0;
        
        Stake memory userStake = stakes[user];
        if (userStake.amount == 0) return 0;
        
        // Calculate proportional share of available rewards
        uint256 userShare = (userStake.amount * totalRewardsAvailable) / totalStaked;
        
        // Make sure we don't exceed available rewards
        if (userShare > totalRewardsAvailable) {
            userShare = totalRewardsAvailable;
        }
        
        return userShare;
    }
    
    function _getActivityScalingFactor() internal view returns (uint256) {
        if (totalStreamVolume24h == 0) return 0;
        
        // Scale from 1x to 10x based on activity
        // 0-100 ETH = 1x, 100-500 ETH = 2x, 500-1000 ETH = 5x, 1000+ ETH = 10x
        if (totalStreamVolume24h < 100 ether) return 100; // 1x
        if (totalStreamVolume24h < 500 ether) return 200; // 2x
        if (totalStreamVolume24h < 1000 ether) return 500; // 5x
        return 1000; // 10x
    }
    
    function _updateActivity(uint256 streamAmount) internal {
        // Reset activity if 24 hours have passed
        if (block.timestamp - lastActivityUpdate >= ACTIVITY_WINDOW) {
            totalStreamVolume24h = 0;
            lastActivityUpdate = block.timestamp;
        }
        
        totalStreamVolume24h += streamAmount;
    }

    // ============ EXCESS FUND DISTRIBUTION ============
    
    function calculateExcessFunds() public view returns (uint256) {
        if (totalStaked == 0) return 0;
        
        // Calculate theoretical APY
        uint256 timeBasedAPY = _getActivityScalingFactor() * baseRewardRate * 24 * 365 / 100;
        uint256 feeBasedAPY = (totalRewardsAvailable * 10000) / totalStaked;
        uint256 totalAPY = timeBasedAPY + feeBasedAPY;
        
        if (totalAPY <= apyCapBPS) return 0;
        
        // Calculate excess
        uint256 excessAPY = totalAPY - apyCapBPS;
        return (totalStaked * excessAPY) / 10000;
    }
    
    function distributeExcessFunds() external onlyOwner nonReentrant {
        uint256 excessFunds = calculateExcessFunds();
        require(excessFunds > 0, "SonicRush: No excess funds to distribute");
        
        uint256 ownerShare = (excessFunds * 50) / 100;
        uint256 charityShare = (excessFunds * 30) / 100;
        uint256 stakerBonus = (excessFunds * 20) / 100;
        
        ownerRevenue += ownerShare;
        charityFunds += charityShare;
        totalRewardsAvailable += stakerBonus;
        
        emit ExcessFundsDistributed(excessFunds, ownerShare, charityShare, stakerBonus);
    }

    // ============ WITHDRAWAL FUNCTIONS ============
    
    function withdrawOwnerRevenue(uint256 amount) external onlyOwner nonReentrant {
        require(amount <= ownerRevenue, "SonicRush: Insufficient owner revenue");
        
        ownerRevenue -= amount;
        
        (bool success, ) = owner.call{value: amount}("");
        require(success, "SonicRush: Transfer failed");
        
        emit OwnerRevenueWithdrawn(owner, amount);
    }
    
    function withdrawCharityFunds(uint256 amount) external nonReentrant {
        require(msg.sender == charityAddress, "SonicRush: Only charity can withdraw");
        require(amount <= charityFunds, "SonicRush: Insufficient charity funds");
        
        charityFunds -= amount;
        
        (bool success, ) = charityAddress.call{value: amount}("");
        require(success, "SonicRush: Transfer failed");
        
        emit CharityFundsWithdrawn(charityAddress, amount);
    }

    // ============ VIEW FUNCTIONS ============
    
    function getStream(uint256 streamId) external view returns (Stream memory) {
        return streams[streamId];
    }
    
    function getTotalStreams() external view returns (uint256) {
        return nextStreamId;
    }
    
    function getUserStake(address user) external view returns (Stake memory) {
        return stakes[user];
    }
    
    function getVaultStats() external view returns (uint256, uint256, uint256) {
        return (totalStaked, totalRewardsAvailable, nextStreamId);
    }
    
    function getFeeInfo() external view returns (uint256, uint256, uint256, uint256) {
        return (STREAMING_FEE_BPS, 0, ownerRevenue, charityFunds);
    }
    
    function getRevenueSplit() external view returns (uint256, uint256) {
        return (stakerShareBPS, ownerShareBPS);
    }
    
    function isSolvent() external view returns (bool) {
        return address(this).balance >= totalStaked + totalRewardsAvailable;
    }
    
    function getBalanceInfo() external view returns (
        uint256 balance,
        uint256 totalStakedAmount,
        uint256 availableForRewards,
        uint256 ownerRevenueAvailable,
        uint256 charityFundsAvailable
    ) {
        balance = address(this).balance;
        totalStakedAmount = totalStaked;
        availableForRewards = totalRewardsAvailable;
        ownerRevenueAvailable = ownerRevenue;
        charityFundsAvailable = charityFunds;
    }
    
    function getCurrentAPY() external view returns (uint256) {
        if (totalStaked == 0) return 0;
        
        uint256 timeBasedAPY = _getActivityScalingFactor() * baseRewardRate * 24 * 365 / 100;
        uint256 feeBasedAPY = (totalRewardsAvailable * 10000) / totalStaked;
        uint256 totalAPY = timeBasedAPY + feeBasedAPY;
        
        return totalAPY > apyCapBPS ? apyCapBPS : totalAPY;
    }
    
    function getActivityInfo() external view returns (uint256, uint256, uint256) {
        return (totalStreamVolume24h, lastActivityUpdate, _getActivityScalingFactor());
    }

    // ============ OWNER FUNCTIONS ============
    
    function updateRewardRate(uint256 newRate) external onlyOwner {
        baseRewardRate = newRate;
    }
    
    function setVaultPaused(bool paused) external onlyOwner {
        vaultActive = !paused;
    }
    
    function updateVaultParams(string memory _vaultName) external onlyOwner {
        vaultName = _vaultName;
    }
    
    function emergencyPause() external onlyOwner {
        vaultActive = false;
    }

    // ============ RECEIVE FUNCTION ============
    
    receive() external payable {}
}
