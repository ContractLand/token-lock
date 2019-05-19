pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/token/ERC20/StandardToken.sol";

contract TestToken is StandardToken {
  function setBalance(address receipient, uint _value) public {
      balances[receipient] = _value;
  }
}
