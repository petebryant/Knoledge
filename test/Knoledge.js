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
  it("should get 0x0 address from getRecord with empty registry", function() {
    var knol = Knoledge.deployed();
    return knol.getRecord.call(20).then(function(array){
      console.log("GetRecord: " + array);
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
  it("should throw when transferownership not called by owner", function(){
    var thrown = false;
    var knol = Knoledge.deployed();
    knol.owner.call().then(function(owner){;
      return knol.transferOwnership(accounts[3], {from: accounts[2]})
      }).catch(function(error){
        //console.log("Error:"  + error);
        thrown = true;
      }).then(function(){
        assert.isTrue(thrown, "didn't throw as expected");
    });
  });
  it("should throw when addItem called with empty key", function(){
    var thrown = false;
    var knol = Knoledge.deployed();
    knol.owner.call().then(function(owner){
      return knol.addItem("","value");
      }).catch(function(error){
        //console.log("Error:"  + error);
        thrown = true;
      }).then(function(){
        assert.isTrue(thrown, "didn't throw as expected");
    });
  }); 
  it("should throw when addItem called with empty value", function(){
    var thrown = false;
    var knol = Knoledge.deployed();
    knol.owner.call().then(function(owner){
      return knol.addItem.call("key","");
      }).catch(function(error){
       // console.log("Error:"  + error);
        thrown = true;
      }).then(function(){
        assert.isTrue(thrown, "didn't throw as expected");
    });
  });   
  it("should get address from getRecord", function() {
    var knol = Knoledge.deployed();
      return knol.getRecord.call(1).then(function(array){
        console.log("GetRecord: " + array);
        assert.equal(array[0], accounts[0] , "unexpected address returned");
      });
  });  
  it("should get string from getItem", function() {
    var knol = Knoledge.deployed();
    return knol.getItem.call(1,1).then(function(array){
      console.log("GetItem: " + array);
      assert.equal(array[0], "item", "unexpected item returned");
      assert.equal(array[1], "value", "unexpected value returned");
    });
  }); 
  it("should get address from getOwnersRecord", function() {
    var knol = Knoledge.deployed();
      return knol.getOwnersRecord.call().then(function(array){
        console.log("GetOwnerRecord: " + array);
        assert.equal(array[0], accounts[0] , "unexpected record returned");
      });
  }); 
  it("should return 0x0 getOwnersRecord when there is no record", function() {
    var knol = Knoledge.deployed();
      return knol.getOwnersRecord.call({from: accounts[2]}).then(function(array){
        console.log("GetOwnerRecord: " + array);
        assert.equal(array[0], 0x0 , "unexpected record returned");
      });
  }); 
});
