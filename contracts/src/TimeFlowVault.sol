// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title TimeFlowVault
 * @dev Hybrid protocol combining real-time money streaming with realistic DeFi vault functionality
 * 
 * KEY FEATURES:
 * 1. Streaming fees generate revenue for rewards
 * 2. Rewards only paid when contract has sufficient funds
 * 3. No infinite money printing
 * 4. Sustainable reward system
 */
contract TimeFlowVault {
    // ============ ACCESS CONTROL ============
    
    address public owner;
    bool private _locked;
    
    modifier onlyOwner() {
        require(msg.sender == owner, "TimeFlowVault: Not the owner");
        _;
    }
    
    modifier nonReentrant() {
        require(!_locked, "TimeFlowVault: Reentrant call");
        _locked = true;
        _;
        _locked = false;
    }

    // ============ STREAMING FEATURES ============
    
    struct Stream {
        address sender;
        address recipient;
        uint256 totalAmount;
        uint256 flowRate; // amount per second
        uint256 startTime;
        uint256 stopTime;
        uint256 amountWithdrawn;
        bool isActive;
    }

    mapping(uint256 => Stream) public streams;
    uint256 public nextStreamId;
    
    // Streaming fee (0.1% = 10 basis points)
    uint256 public constant STREAMING_FEE_BPS = 10; // 0.1%
    uint256 public totalFeesCollected;

    // ============ VAULT FEATURES ============
    
    string public vaultName;
    uint256 public totalStaked;
    uint256 public totalRewardsAvailable;
    uint256 public lastUpdateTime;
    uint256 public rewardRate; // basis points per second (sustainable)
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

    // ============ EVENTS ============
    
    // Streaming events
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

    event StreamCancelled(
        uint256 indexed streamId,
        address indexed sender,
        address indexed recipient,
        uint256 senderBalance,
        uint256 recipientBalance
    );

    // Vault events
    event VaultCreated(string vaultName, uint256 initialRewardRate);
    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event RewardsClaimed(address indexed user, uint256 amount);
    event VaultPaused(bool paused);
    event RewardRateUpdated(uint256 newRate);

    // ============ MODIFIERS ============
    
    modifier onlyVaultActive() {
        require(vaultActive, "TimeFlowVault: Vault is paused");
        _;
    }

    modifier validAmount(uint256 amount) {
        require(amount > 0, "TimeFlowVault: Amount must be positive");
        _;
    }

    // ============ CONSTRUCTOR ============
    
    constructor(string memory _vaultName, uint256 _initialRewardRate) {
        owner = msg.sender;
        vaultName = _vaultName;
        rewardRate = _initialRewardRate; // Set to 1 for ~1% APY (per second)
        vaultActive = true;
        lastUpdateTime = block.timestamp;
        
        emit VaultCreated(_vaultName, _initialRewardRate);
    }

    // ============ STREAMING FUNCTIONS ============
    
    /**
     * @dev Create a new money stream
     * @param recipient Address receiving the stream
     * @param duration Duration of the stream in seconds
     */
    function createStream(address recipient, uint256 duration) external payable {
        require(recipient != address(0), "TimeFlowVault: Invalid recipient");
        require(recipient != msg.sender, "TimeFlowVault: Cannot stream to self");
        require(duration > 0, "TimeFlowVault: Duration must be positive");
        require(msg.value > 0, "TimeFlowVault: Amount must be positive");

        // Calculate fee
        uint256 fee = (msg.value * STREAMING_FEE_BPS) / 10000;
        uint256 streamAmount = msg.value - fee;
        
        // Collect fee
        totalFeesCollected += fee;
        totalRewardsAvailable += fee; // All fees go to stakers
        
        uint256 streamId = nextStreamId++;
        uint256 flowRate = streamAmount / duration;

        streams[streamId] = Stream({
            sender: msg.sender,
            recipient: recipient,
            totalAmount: streamAmount,
            flowRate: flowRate,
            startTime: block.timestamp,
            stopTime: block.timestamp + duration,
            amountWithdrawn: 0,
            isActive: true
        });

        emit StreamCreated(
            streamId,
            msg.sender,
            recipient,
            streamAmount,
            flowRate,
            block.timestamp,
            block.timestamp + duration,
            fee
        );
    }

    /**
     * @dev Withdraw funds from a stream
     * @param streamId ID of the stream to withdraw from
     */
    function withdrawFromStream(uint256 streamId) external nonReentrant {
        Stream storage stream = streams[streamId];
        require(stream.isActive, "TimeFlowVault: Stream is not active");
        require(msg.sender == stream.recipient, "TimeFlowVault: Only recipient can withdraw");

        uint256 claimable = getClaimableBalance(streamId);
        require(claimable > 0, "TimeFlowVault: Nothing to withdraw");

        stream.amountWithdrawn += claimable;
        
        // If stream is finished and all funds withdrawn, mark as inactive
        if (block.timestamp >= stream.stopTime && 
            stream.amountWithdrawn >= stream.totalAmount) {
            stream.isActive = false;
        }

        (bool success, ) = msg.sender.call{value: claimable}("");
        require(success, "TimeFlowVault: Transfer failed");

        emit Withdrawn(streamId, msg.sender, claimable);
    }

    /**
     * @dev Cancel a stream and refund remaining funds
     * @param streamId ID of the stream to cancel
     */
    function cancelStream(uint256 streamId) external nonReentrant {
        Stream storage stream = streams[streamId];
        require(stream.isActive, "TimeFlowVault: Stream is not active");
        require(
            msg.sender == stream.sender || msg.sender == stream.recipient,
            "TimeFlowVault: Only sender or recipient can cancel"
        );

        uint256 recipientBalance = getClaimableBalance(streamId);
        uint256 senderBalance = stream.totalAmount - stream.amountWithdrawn - recipientBalance;

        stream.isActive = false;

        // Refund recipient
        if (recipientBalance > 0) {
            (bool success, ) = stream.recipient.call{value: recipientBalance}("");
            require(success, "TimeFlowVault: Recipient refund failed");
        }

        // Refund sender
        if (senderBalance > 0) {
            (bool success, ) = stream.sender.call{value: senderBalance}("");
            require(success, "TimeFlowVault: Sender refund failed");
        }

        emit StreamCancelled(
            streamId,
            stream.sender,
            stream.recipient,
            senderBalance,
            recipientBalance
        );
    }

    /**
     * @dev Get the claimable balance for a stream
     * @param streamId ID of the stream
     * @return Claimable amount in wei
     */
    function getClaimableBalance(uint256 streamId) public view returns (uint256) {
        Stream storage stream = streams[streamId];
        if (!stream.isActive) return 0;

        uint256 currentTime = block.timestamp;
        uint256 cappedNow = currentTime > stream.stopTime ? stream.stopTime : currentTime;
        uint256 elapsed = cappedNow - stream.startTime;
        
        uint256 streamedSoFar = elapsed * stream.flowRate;
        uint256 claimable = streamedSoFar > stream.amountWithdrawn ? 
            streamedSoFar - stream.amountWithdrawn : 0;

        return claimable;
    }

    // ============ VAULT FUNCTIONS ============
    
    /**
     * @dev Stake ETH into the vault
     */
    function stake() external payable onlyVaultActive validAmount(msg.value) nonReentrant {
        require(!stakes[msg.sender].isActive, "TimeFlowVault: Already staked");
        
        stakes[msg.sender] = Stake({
            amount: msg.value,
            startTime: block.timestamp,
            lastClaimTime: block.timestamp,
            accumulatedRewards: 0,
            isActive: true
        });
        
        totalStaked += msg.value;
        emit Staked(msg.sender, msg.value);
    }

    /**
     * @dev Unstake ETH from the vault
     * @param amount Amount to unstake
     */
    function unstake(uint256 amount) external onlyVaultActive validAmount(amount) nonReentrant {
        Stake storage userStake = stakes[msg.sender];
        require(userStake.isActive, "TimeFlowVault: No active stake");
        require(amount <= userStake.amount, "TimeFlowVault: Insufficient staked amount");
        
        userStake.amount -= amount;
        totalStaked -= amount;
        
        if (userStake.amount == 0) {
            userStake.isActive = false;
        }
        
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "TimeFlowVault: Transfer failed");
        
        emit Unstaked(msg.sender, amount);
    }

    /**
     * @dev Claim accumulated rewards (SUSTAINABLE: only pay what we can afford)
     */
    function claimRewards() external onlyVaultActive nonReentrant {
        require(stakes[msg.sender].isActive, "TimeFlowVault: No active stake");
        
        // Calculate new rewards since last claim
        uint256 secondsElapsed = block.timestamp - stakes[msg.sender].lastClaimTime;
        uint256 newRewards = (stakes[msg.sender].amount * rewardRate * secondsElapsed) / 10000;
        uint256 totalClaimable = userRewards[msg.sender] + newRewards;
        
        require(totalClaimable > 0, "TimeFlowVault: No rewards to claim");
        
        // SUSTAINABLE: Only pay what we can afford
        uint256 actualPayout = totalClaimable > totalRewardsAvailable ? 
            totalRewardsAvailable : totalClaimable;
        
        require(actualPayout > 0, "TimeFlowVault: No rewards available to claim");
        
        // Update user's last claim time and reset accumulated rewards
        stakes[msg.sender].lastClaimTime = block.timestamp;
        userRewards[msg.sender] = 0;
        
        // Reduce available rewards
        totalRewardsAvailable -= actualPayout;
        
        // Transfer actual available rewards to user
        (bool success, ) = msg.sender.call{value: actualPayout}("");
        require(success, "TimeFlowVault: Transfer failed");
        
        emit RewardsClaimed(msg.sender, actualPayout);
    }

    /**
     * @dev Get claimable rewards for a user
     * @param user Address of the user
     * @return Claimable rewards amount
     */
    function getClaimableRewards(address user) external view returns (uint256) {
        if (!stakes[user].isActive) return userRewards[user];
        
        uint256 secondsElapsed = block.timestamp - stakes[user].lastClaimTime;
        uint256 newRewards = (stakes[user].amount * rewardRate * secondsElapsed) / 10000;
        
        return userRewards[user] + newRewards;
    }

    /**
     * @dev Get REALISTIC claimable rewards (capped by available funds)
     * @param user Address of the user
     * @return Actually claimable rewards amount
     */
    function getRealisticClaimableRewards(address user) external view returns (uint256) {
        uint256 theoretical = this.getClaimableRewards(user);
        return theoretical > totalRewardsAvailable ? totalRewardsAvailable : theoretical;
    }

    // ============ VIEW FUNCTIONS ============
    
    /**
     * @dev Get stream information
     * @param streamId ID of the stream
     * @return Stream details
     */
    function getStream(uint256 streamId) external view returns (Stream memory) {
        return streams[streamId];
    }

    /**
     * @dev Get total streams count
     * @return Total number of streams created
     */
    function getTotalStreams() external view returns (uint256) {
        return nextStreamId;
    }

    /**
     * @dev Get user stake information
     * @param user Address of the user
     * @return Stake details
     */
    function getUserStake(address user) external view returns (Stake memory) {
        return stakes[user];
    }

    /**
     * @dev Get vault statistics
     * @return Total staked, total rewards available, reward rate
     */
    function getVaultStats() external view returns (uint256, uint256, uint256) {
        return (totalStaked, totalRewardsAvailable, rewardRate);
    }

    /**
     * @dev Get fee information
     * @return Fee basis points, total fees collected
     */
    function getFeeInfo() external view returns (uint256, uint256) {
        return (STREAMING_FEE_BPS, totalFeesCollected);
    }

    // ============ ADMIN FUNCTIONS ============
    
    /**
     * @dev Update reward rate (per second basis points)
     * @param newRate New reward rate in basis points per second
     */
    function updateRewardRate(uint256 newRate) external onlyOwner {
        rewardRate = newRate;
        emit RewardRateUpdated(newRate);
    }

    /**
     * @dev Pause/unpause vault
     * @param paused Whether to pause the vault
     */
    function setVaultPaused(bool paused) external onlyOwner {
        vaultActive = !paused;
        emit VaultPaused(paused);
    }

    /**
     * @dev Update vault parameters
     * @param _vaultName New vault name
     */
    function updateVaultParams(string memory _vaultName) external onlyOwner {
        vaultName = _vaultName;
    }

    /**
     * @dev Emergency pause function
     */
    function emergencyPause() external onlyOwner {
        vaultActive = false;
        emit VaultPaused(true);
    }

    /**
     * @dev Get vault information
     * @return name Vault name
     * @return staked Total staked amount
     * @return rewards Total rewards available
     * @return rate Current reward rate (per second)
     * @return active Whether vault is active
     */
    function getVaultInfo() external view returns (
        string memory name,
        uint256 staked,
        uint256 rewards,
        uint256 rate,
        bool active
    ) {
        return (vaultName, totalStaked, totalRewardsAvailable, rewardRate, vaultActive);
    }
}
