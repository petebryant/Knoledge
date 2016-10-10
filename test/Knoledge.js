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
      return knol.transferOwnership(accounts[0], {from: accounts[1]});
    });
  }); 
  it("should get empty string from getItem with empty registry", function() {
    var knol = Knoledge.deployed();
    return knol.getItem.call(0, 0).then(function(array){
      console.log("GetItem: " + array[0]);
      assert.equal(array[0], "", "unexpected data returned");
    });
  });
  it("should get 0x00 address from getRecord with empty registry", function() {
    var knol = Knoledge.deployed();
    return knol.getRecord.call(0, 0).then(function(array){
      console.log("GetRecord: " + array[0]);
      assert.equal(array[0], 0x0 , "unexpected data returned");
    });
  });
   it("should return false from hasRecords() with no records", function() {
    var knol = Knoledge.deployed();
    return knol.hasRecords.call({from: accounts[9]}).then(function(has){
      assert.isFalse(has , "didn't return false");
    });
  }); 
    it("should return true from hasRecords() when addItem() is successful", function(done) {
    var knol = Knoledge.deployed();
    knol.addItem("item", "value").then(function(){
    return knol.hasRecords.call().then(function(has){
      assert.isTrue(has, "didn't return true");
    });
    }).then(done).catch(done);
  }); 
  it("should emit event and fail (shows 1 emitted)", function(done) {
    var knol = Knoledge.deployed();
    knol.addItem("item", "value").then(function(){
      assert.isTrue(false);
    }).then(done).catch(done);
  }); 
  it("transferownership not called by owner throws", function(){
    var thrown = false;
    Knoledge.new().then(function(knol){
      return knol.transferOwnership(accounts[3], {from: accounts[2]})
      }).catch(function(error){
        thrown = true;
      }).then(function(){
        assert.isTrue(thrown, "didn't throw as expected");
    });
  });
});
