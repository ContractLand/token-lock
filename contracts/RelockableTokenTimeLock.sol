pragma solidity ^0.4.25;

import "./library/SafeERC20.sol";

/**
 * @title RelockableTokenTimelock
 * @dev RelockableTokenTimelock is a token holder contract that will allow a
 * beneficiary to extract the tokens after a given release time or op-in to lock again.
 */
contract RelockableTokenTimelock {
    using SafeERC20 for IERC20;

    // ERC20 basic token contract being held
    IERC20 private _token;

    // beneficiary of tokens after they are released
    address private _beneficiary;

    // duration of lock
    uint256 private _lockDuration;

    // timestamp when token release is enabled
    uint256 private _releaseTime;

    // owner of contract
    address public _owner;

    constructor (IERC20 token, address owner, address beneficiary, uint256 lockDuration) public {
        // solhint-disable-next-line not-rely-on-time
        require(lockDuration > 0, "RelockableTokenTimelock: lock duration should be greater than zero");
        _token = token;
        _owner = owner;
        _beneficiary = beneficiary;
        _lockDuration = lockDuration;
        _releaseTime = block.timestamp + lockDuration;
    }

    /**
     * @return the token being held.
     */
    function token() public view returns (IERC20) {
        return _token;
    }

    /**
     * @return the beneficiary of the tokens.
     */
    function beneficiary() public view returns (address) {
        return _beneficiary;
    }

    /**
     * @return the lock duration
     */
    function lockDuration() public view returns (uint256) {
        return _lockDuration;
    }

    /**
     * @return the time when the tokens are released.
     */
    function releaseTime() public view returns (uint256) {
        return _releaseTime;
    }

    /**
     * @notice Transfers tokens held by timelock to beneficiary.
     */
    function lock() public {
      require(msg.sender == _owner, "RelockableTokenTimelock: only owner can lock");
      require(block.timestamp >= _releaseTime, "RelockableTokenTimelock: previous lock period not past");
      _releaseTime = block.timestamp + _lockDuration;
    }

    /**
     * @notice Transfers tokens held by timelock to beneficiary.
     */
    function release() public {
        require(msg.sender == _owner, "RelockableTokenTimelock: only owner can release");

        // solhint-disable-next-line not-rely-on-time
        require(block.timestamp >= _releaseTime, "RelockableTokenTimelock: current time is before release time");

        uint256 amount = _token.balanceOf(address(this));
        require(amount > 0, "RelockableTokenTimelock: no tokens to release");

        _token.safeTransfer(_beneficiary, amount);
    }
}
