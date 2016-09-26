contract('Knoledge', function(accounts) {
  it("Should be deployed", function() {
    var knol = Knoledge.deployed();
    assert.isTrue(true);
  });
  it("Should set ctor values", function() {
    var knol = Knoledge.deployed();
    var theOwner;
    return knol.owner.call().then(function(owner){
      theOwner = owner;
      assert.equal(owner,accounts[0], "not the expected owner " + owner);
      return knol.name.call().then(function(name){
        assert.equal(name, "Knoledge", "the contract wasn't called Knoledge");
      }); 
    });
  });
  it("should transfer ownership by owner", function() {
    var knol = Knoledge.deployed();
    knol.transferOwnership(accounts[1], {from: accounts[0]});
    return knol.owner.call().then(function(newOwner){
      console.log("Account[0]: " + accounts[0]);
     	console.log("New owner: " + newOwner);
      assert.equal(newOwner, accounts[1],"Ownership was not changed correctly");
    });
  }); 
  it("should only transfer ownership by owner", function() {
    var knol = Knoledge.deployed();
    knol.transferOwnership(accounts[3], {from: accounts[2]})
    return knol.owner.call().then(function(newOwner){
      console.log("Owner: " + newOwner);
      assert.notEqual(newOwner, accounts[3],"Ownership was incorrectly chnaged by non-owner");
      return knol.transferOwnership(accounts[0], {from: accounts[1]});
    });
  });
  it("should get empty string from getItem with empty registry", function() {
    var knol = Knoledge.deployed();
    return knol.getItem(0, 0).then(function(array){
      console.log("key: " + array[0]);
      assert.equal(array[0], "", "unexpected data returned");
    });
  });
  it("should get 0x00 address from getRecord with empty registry", function() {
    var knol = Knoledge.deployed();
    return knol.getRecord(0, 0).then(function(array){
      console.log("owner: " + array[0]);
      assert.equal(array[0], 0x0 , "unexpected data returned");
    });
  });
  it("should get 0x00 address from getRecord with empty registry", function() {
    var knol = Knoledge.deployed();
    return knol.addItem("item", "value").then(function(success){
      console.log("success: " + success);
      assert.equal(success, true , "unexpected data returned");
    });
  });
});
