contract Owned {
    address public owner;

    function Owned() {
        owner = msg.sender;
    }

    modifier onlyOwner {
        if (msg.sender != owner) throw;
        // the following underline shows the position of the code ofthe actual
        // modified function...
        _
    }

    function transferOwnership(address newOwner) onlyOwner {
        owner = newOwner;
    }
}