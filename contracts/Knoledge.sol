import "Owned.sol";
import "StringUtils.sol";

contract Knoledge is Owned  {
	string public version = "1.0";
    string public name;

	uint records = 0;
	uint root_record = 1;

	struct Item {
		string key;						
		string value;					// the actual data being registered
		uint prev_item;					// so we can append and delete items		
		uint next_item;					// make this a double linked list
	}

	struct Record {
		address owner;					// owner of the record
		uint root_item;					// first Item in the items list
		uint next_record;				// make this a linked list		
		mapping (uint => Item) items;
	}

	mapping (uint => Record) register;		// the actual owner/data register 
	mapping (address => uint) recordOwners; 	//  quick lookup of who owns which records

	event RegisterChange(address indexed sender, uint record, uint item);

	function Knoledge(string _name) {
		name = _name;
	}

	function hasRecords() constant returns(bool has) {
		has = (recordOwners[msg.sender] != 0); 
	}

	function getItem(uint _record, uint _item) constant returns 
		(string key, string value, uint prev_item, uint next_item) {
		Item item = register[_record].items[_item];

		key = item.key;
		value = item.value;
		prev_item = item.prev_item;
		next_item = item.next_item;
	}

	function getRecord(uint _record) constant returns 
		(address owner, uint root_item, uint numb_items, uint next_record ) {
		Record record = register[_record];

		owner = record.owner;
		root_item = record.root_item;
		next_record = record.next_record;
	}	

	function addItem( string _key, string _value) {
		if (StringUtils.equal(_key,"")) throw;
		if (StringUtils.equal(_value,"")) throw;

		uint record = recordOwners[msg.sender];
		uint item = 1;

		if (record == 0) {
			record = root_record;
			root_record++;

			Record newRecord = register[record];
			newRecord.owner = msg.sender;
			newRecord.root_item = 1;
			newRecord.next_record = root_record;

			Item newItem = newRecord.items[item];
			newItem.key = _key;
			newItem.value = _value;
			newItem.prev_item = 0;
			newItem.next_item = 2;
		
			recordOwners[msg.sender] = record; 
		}
		else
		{
			Record existingRecord = register[record];
		}
		
		RegisterChange(msg.sender, record, item);
	}

	/* this unnamed function is called whenever someone tries to send ether to the contract */
    function() {
        throw;
    }
}
