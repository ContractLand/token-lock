pragma solidity ^0.4.25;

import "./library/SafeERC20.sol";
import "./library/SafeMath.sol";

/**
 * @title TokenMultiTimelock
 * @dev TokenMultiTimelock is a token holder contract that will allow a
 * beneficiary to extract the tokens after a given release time.
 */
contract TokenMultiTimelock {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    // ERC20 basic token contract being held
    IERC20 private _token;

    // beneficiary of tokens after they are released
    address private _beneficiary;

    // timestamps when token release is enabled
    uint256[] private _releaseTimes;

    // number of times already released
    uint8 private _curRelease;

    // owner of contract
    address public _owner;

    constructor (IERC20 token, address beneficiary, address owner, uint256[] releaseTimes) public {
        // solhint-disable-next-line not-rely-on-time
        for (uint i = 0; i < releaseTimes.length; i++) {
          require(releaseTimes[i] > block.timestamp, "TokenMultiTimelock: release time is before current time");
        }

        _token = token;
        _beneficiary = beneficiary;
        _releaseTimes = releaseTimes;
        _owner = owner;
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
     * @return the time when the tokens are released.
     */
    function releaseTime(uint index) public view returns (uint256) {
        return _releaseTimes[index];
    }

    /**
     * @notice Transfers tokens held by timelock to beneficiary.
     */
    function release() public {
        // solhint-disable-next-line not-rely-on-time
        require(_curRelease < _releaseTimes.length, "TokenMultiTimelock: all limits has been released");
        require(block.timestamp >= _releaseTimes[_curRelease], "TokenMultiTimelock: current time is before release time");

        uint256 amountTotal = _token.balanceOf(address(this));
        uint256 amountToRelease = amountTotal.div(_releaseTimes.length - _curRelease);
        require(amountTotal >= amountToRelease, "TokenMultiTimelock: no tokens to release");
        _token.safeTransfer(_beneficiary, amountToRelease);

        _curRelease++;
    }

    /**
     * @notice Transfers tokens unclaimed by beneficiary to owner
     */
    function claim() public {
      require(msg.sender == _owner, "only owner");

      uint256 amount = _token.balanceOf(address(this));
      require(amount > 0, "TokenMultiTimelock: no tokens to claim");

      _token.safeTransfer(_owner, amount);
    }
}
