pragma solidity ^0.4.0;

contract Paper {
    uint256 keyIndex;
    struct userInformation {
        string userName;
        string userAddress;
        string userPhone;
        string inTime;
    }

    mapping (uint256 => userInformation) Obj;
    function setUserInformation(string _userName, string _userAddress, string _userPhone, string _inTime) constant returns (uint256) {
        Obj[keyIndex].userName = _userName;
        Obj[keyIndex].userAddress = _userAddress;
        Obj[keyIndex].userPhone = _userPhone;
        Obj[keyIndex].inTime = _inTime;
        keyIndex++;
        return keyIndex;
    }

    function getUserName(uint _key) constant returns (string) {
        return Obj[_key].userName;
    }

    function getUserAddress(uint _key) constant returns (string) {
        return Obj[_key].userAddress;
    }

    function getUserPhone(uint _key) constant returns (string) {
        return Obj[_key].userPhone;
    }

    function getInTime(uint _key) constant returns (string) {
        return Obj[_key].inTime;
    }
}
