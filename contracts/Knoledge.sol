import "Owned.sol";

contract Knoledge is Owned  {
	string public version = "1.0";
    string public name;

	uint entries = 0;
	uint root_entry = 0;

	struct Item {
		string key;						
		string value;					// the actual data being registered
		uint next_item;					// make this a double linked list
		uint prev_item;					// so we can append and delete items
	}

	struct Record {
		address owner;					// owner of the record
		uint next_record;				// make this a linked list
		uint root_item;					// first Item in the items list
		mapping (uint => Item) items;
	}

	mapping (uint => Record) register;		// the actual owner/data register 
	mapping (address => uint) recordOwners; 	//  quick lookup of who owns which records

	event RegisterChange(address indexed sender, uint record, uint item);
	event Called();
	function Knoledge(string _name) {
		name = _name;
	}

	function getItem(uint _record, uint _item) constant returns 
		(string key, string value, uint next_item, uint prev_item) {
		Item item = register[_record].items[_item];

		key = item.key;
		value = item.value;
		next_item = item.next_item;
		prev_item = item.prev_item;
	}

	function getRecord(uint _record) constant returns (address owner, uint next_record, uint root_item) {
		Record record = register[_record];

		owner = record.owner;
		next_record = record.next_record;
		root_item = record.root_item;
	}	

	function addItem( string _key, string _value) {
		/* if (recordOwners[msg.sender] == 0) {
			throw;
		} */
		Called();
		//RegisterChange(msg.sender, 1, 1);
	}

	/* this unnamed function is called whenever someone tries to send ether to the contract */
    function() {
        throw;
    }
}
