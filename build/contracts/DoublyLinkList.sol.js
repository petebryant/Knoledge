var Web3 = require("web3");

(function() {
  // Planned for future features, logging, etc.
  function Provider(provider) {
    this.provider = provider;
  }

  Provider.prototype.send = function() {
    this.provider.send.apply(this.provider, arguments);
  };

  Provider.prototype.sendAsync = function() {
    this.provider.sendAsync.apply(this.provider, arguments);
  };

  var BigNumber = (new Web3()).toBigNumber(0).constructor;

  var Utils = {
    is_object: function(val) {
      return typeof val == "object" && !Array.isArray(val);
    },
    is_big_number: function(val) {
      if (typeof val != "object") return false;

      // Instanceof won't work because we have multiple versions of Web3.
      try {
        new BigNumber(val);
        return true;
      } catch (e) {
        return false;
      }
    },
    merge: function() {
      var merged = {};
      var args = Array.prototype.slice.call(arguments);

      for (var i = 0; i < args.length; i++) {
        var object = args[i];
        var keys = Object.keys(object);
        for (var j = 0; j < keys.length; j++) {
          var key = keys[j];
          var value = object[key];
          merged[key] = value;
        }
      }

      return merged;
    },
    promisifyFunction: function(fn, C) {
      var self = this;
      return function() {
        var instance = this;

        var args = Array.prototype.slice.call(arguments);
        var tx_params = {};
        var last_arg = args[args.length - 1];

        // It's only tx_params if it's an object and not a BigNumber.
        if (Utils.is_object(last_arg) && !Utils.is_big_number(last_arg)) {
          tx_params = args.pop();
        }

        tx_params = Utils.merge(C.class_defaults, tx_params);

        return new Promise(function(accept, reject) {
          var callback = function(error, result) {
            if (error != null) {
              reject(error);
            } else {
              accept(result);
            }
          };
          args.push(tx_params, callback);
          fn.apply(instance.contract, args);
        });
      };
    },
    synchronizeFunction: function(fn, C) {
      var self = this;
      return function() {
        var args = Array.prototype.slice.call(arguments);
        var tx_params = {};
        var last_arg = args[args.length - 1];

        // It's only tx_params if it's an object and not a BigNumber.
        if (Utils.is_object(last_arg) && !Utils.is_big_number(last_arg)) {
          tx_params = args.pop();
        }

        tx_params = Utils.merge(C.class_defaults, tx_params);

        return new Promise(function(accept, reject) {

          var callback = function(error, tx) {
            if (error != null) {
              reject(error);
              return;
            }

            var timeout = C.synchronization_timeout || 240000;
            var start = new Date().getTime();

            var make_attempt = function() {
              C.web3.eth.getTransactionReceipt(tx, function(err, receipt) {
                if (err) return reject(err);

                if (receipt != null) {
                  return accept(tx, receipt);
                }

                if (timeout > 0 && new Date().getTime() - start > timeout) {
                  return reject(new Error("Transaction " + tx + " wasn't processed in " + (timeout / 1000) + " seconds!"));
                }

                setTimeout(make_attempt, 1000);
              });
            };

            make_attempt();
          };

          args.push(tx_params, callback);
          fn.apply(self, args);
        });
      };
    }
  };

  function instantiate(instance, contract) {
    instance.contract = contract;
    var constructor = instance.constructor;

    // Provision our functions.
    for (var i = 0; i < instance.abi.length; i++) {
      var item = instance.abi[i];
      if (item.type == "function") {
        if (item.constant == true) {
          instance[item.name] = Utils.promisifyFunction(contract[item.name], constructor);
        } else {
          instance[item.name] = Utils.synchronizeFunction(contract[item.name], constructor);
        }

        instance[item.name].call = Utils.promisifyFunction(contract[item.name].call, constructor);
        instance[item.name].sendTransaction = Utils.promisifyFunction(contract[item.name].sendTransaction, constructor);
        instance[item.name].request = contract[item.name].request;
        instance[item.name].estimateGas = Utils.promisifyFunction(contract[item.name].estimateGas, constructor);
      }

      if (item.type == "event") {
        instance[item.name] = contract[item.name];
      }
    }

    instance.allEvents = contract.allEvents;
    instance.address = contract.address;
    instance.transactionHash = contract.transactionHash;
  };

  // Use inheritance to create a clone of this contract,
  // and copy over contract's static functions.
  function mutate(fn) {
    var temp = function Clone() { return fn.apply(this, arguments); };

    Object.keys(fn).forEach(function(key) {
      temp[key] = fn[key];
    });

    temp.prototype = Object.create(fn.prototype);
    bootstrap(temp);
    return temp;
  };

  function bootstrap(fn) {
    fn.web3 = new Web3();
    fn.class_defaults  = fn.prototype.defaults || {};

    // Set the network iniitally to make default data available and re-use code.
    // Then remove the saved network id so the network will be auto-detected on first use.
    fn.setNetwork("default");
    fn.network_id = null;
    return fn;
  };

  // Accepts a contract object created with web3.eth.contract.
  // Optionally, if called without `new`, accepts a network_id and will
  // create a new version of the contract abstraction with that network_id set.
  function Contract() {
    if (this instanceof Contract) {
      instantiate(this, arguments[0]);
    } else {
      var C = mutate(Contract);
      var network_id = arguments.length > 0 ? arguments[0] : "default";
      C.setNetwork(network_id);
      return C;
    }
  };

  Contract.currentProvider = null;

  Contract.setProvider = function(provider) {
    var wrapped = new Provider(provider);
    this.web3.setProvider(wrapped);
    this.currentProvider = provider;
  };

  Contract.new = function() {
    if (this.currentProvider == null) {
      throw new Error("DoublyLinkList error: Please call setProvider() first before calling new().");
    }

    var args = Array.prototype.slice.call(arguments);

    if (!this.unlinked_binary) {
      throw new Error("DoublyLinkList error: contract binary not set. Can't deploy new instance.");
    }

    var regex = /__[^_]+_+/g;
    var unlinked_libraries = this.binary.match(regex);

    if (unlinked_libraries != null) {
      unlinked_libraries = unlinked_libraries.map(function(name) {
        // Remove underscores
        return name.replace(/_/g, "");
      }).sort().filter(function(name, index, arr) {
        // Remove duplicates
        if (index + 1 >= arr.length) {
          return true;
        }

        return name != arr[index + 1];
      }).join(", ");

      throw new Error("DoublyLinkList contains unresolved libraries. You must deploy and link the following libraries before you can deploy a new version of DoublyLinkList: " + unlinked_libraries);
    }

    var self = this;

    return new Promise(function(accept, reject) {
      var contract_class = self.web3.eth.contract(self.abi);
      var tx_params = {};
      var last_arg = args[args.length - 1];

      // It's only tx_params if it's an object and not a BigNumber.
      if (Utils.is_object(last_arg) && !Utils.is_big_number(last_arg)) {
        tx_params = args.pop();
      }

      tx_params = Utils.merge(self.class_defaults, tx_params);

      if (tx_params.data == null) {
        tx_params.data = self.binary;
      }

      // web3 0.9.0 and above calls new twice this callback twice.
      // Why, I have no idea...
      var intermediary = function(err, web3_instance) {
        if (err != null) {
          reject(err);
          return;
        }

        if (err == null && web3_instance != null && web3_instance.address != null) {
          accept(new self(web3_instance));
        }
      };

      args.push(tx_params, intermediary);
      contract_class.new.apply(contract_class, args);
    });
  };

  Contract.at = function(address) {
    if (address == null || typeof address != "string" || address.length != 42) {
      throw new Error("Invalid address passed to DoublyLinkList.at(): " + address);
    }

    var contract_class = this.web3.eth.contract(this.abi);
    var contract = contract_class.at(address);

    return new this(contract);
  };

  Contract.deployed = function() {
    if (!this.address) {
      throw new Error("Cannot find deployed address: DoublyLinkList not deployed or address not set.");
    }

    return this.at(this.address);
  };

  Contract.defaults = function(class_defaults) {
    if (this.class_defaults == null) {
      this.class_defaults = {};
    }

    if (class_defaults == null) {
      class_defaults = {};
    }

    var self = this;
    Object.keys(class_defaults).forEach(function(key) {
      var value = class_defaults[key];
      self.class_defaults[key] = value;
    });

    return this.class_defaults;
  };

  Contract.extend = function() {
    var args = Array.prototype.slice.call(arguments);

    for (var i = 0; i < arguments.length; i++) {
      var object = arguments[i];
      var keys = Object.keys(object);
      for (var j = 0; j < keys.length; j++) {
        var key = keys[j];
        var value = object[key];
        this.prototype[key] = value;
      }
    }
  };

  Contract.all_networks = {
  "default": {
    "abi": [
      {
        "constant": false,
        "inputs": [
          {
            "name": "self",
            "type": "DoublyLinkList.data storage"
          },
          {
            "name": "_index",
            "type": "uint80"
          }
        ],
        "name": "iterate_next",
        "outputs": [
          {
            "name": "",
            "type": "uint80"
          }
        ],
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "self",
            "type": "DoublyLinkList.data storage"
          }
        ],
        "name": "iterate_start",
        "outputs": [
          {
            "name": "",
            "type": "uint80"
          }
        ],
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "self",
            "type": "DoublyLinkList.data storage"
          },
          {
            "name": "_index",
            "type": "uint80"
          }
        ],
        "name": "remove",
        "outputs": [],
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "self",
            "type": "DoublyLinkList.data storage"
          },
          {
            "name": "_index",
            "type": "uint80"
          }
        ],
        "name": "iterate_get",
        "outputs": [
          {
            "name": "",
            "type": "bytes32"
          }
        ],
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "self",
            "type": "DoublyLinkList.data storage"
          },
          {
            "name": "_value",
            "type": "bytes32"
          }
        ],
        "name": "find",
        "outputs": [
          {
            "name": "",
            "type": "uint80"
          }
        ],
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "self",
            "type": "DoublyLinkList.data storage"
          },
          {
            "name": "_data",
            "type": "bytes32"
          }
        ],
        "name": "append",
        "outputs": [],
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "self",
            "type": "DoublyLinkList.data storage"
          },
          {
            "name": "_index",
            "type": "uint80"
          }
        ],
        "name": "iterate_prev",
        "outputs": [
          {
            "name": "",
            "type": "uint80"
          }
        ],
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "self",
            "type": "DoublyLinkList.data storage"
          },
          {
            "name": "_index",
            "type": "uint80"
          }
        ],
        "name": "iterate_valid",
        "outputs": [
          {
            "name": "",
            "type": "bool"
          }
        ],
        "type": "function"
      }
    ],
    "unlinked_binary": "0x606060405261066b806100126000396000f36503050000000050606060405236156100745760e060020a60003504632da5b04a81146100795780633d84c78b146100c7578063467aa0e2146100db5780636f919678146102fe5780638a210e351461033f578063cbcd5de714610355578063de18b9ed146103c9578063fcdd7ad81461040e575b610007565b6104336004356024355b600082600101600050600183036001605060020a031681548110156100075790825260209091206002919091020154605060020a90046001605060020a031661042d565b6104336004355b546001605060020a031690565b610450600435602435600082600101600050600183036001605060020a0316815481101561000757906000526020600020906002020160005080549091506001605060020a031660001415610150578054835469ffffffffffffffffffff1916605060020a9091046001605060020a03161783555b8054605060020a90046001605060020a03166000141561019b578054835473ffffffffffffffffffff0000000000000000000019166001605060020a0391909116605060020a021783555b80546001605060020a0316600014610211578054600184018054605060020a83046001605060020a03908116938116600019011690811015610007579060005260206000209060020201600050805473ffffffffffffffffffff000000000000000000001916605060020a929092029190911790555b8054605060020a90046001605060020a031660001461027c5760018301805482546001605060020a038181169392605060020a9092048116600019011690811015610007579060005260206000209060020201600050805469ffffffffffffffffffff191690911790555b60018301805460001984016001605060020a0316908110156100075760009182526020822060029190910201805473ffffffffffffffffffffffffffffffffffffffff1916815560010155825460a060020a8082046001605060020a0316600019010260a060020a69ffffffffffffffffffff0219919091161783555b505050565b6104526004356024355b600082600101600050600183036001605060020a03168154811015610007579082526020909120600291909102016001015461042d565b61043360043560243560006000610483846100ce565b61045060043560243560008260010160005080548060010182818154818355818115116104bf576002028160020283600052602060002091820191016104bf91905b8082111561057d57805473ffffffffffffffffffffffffffffffffffffffff1916815560006001820155600201610397565b610433600435602435600082600101600050600183036001605060020a03168154811015610007579082526020909120600290910201546001605060020a031661042d565b6104646004356024355b600182015460001982016001605060020a0316105b92915050565b604080516001605060020a03929092168252519081900360200190f35b005b60408051918252519081900360200190f35b604080519115158252519081900360200190f35b8091505b5092915050565b90505b6104908482610418565b1561047857826104a08583610308565b14156104ae5780915061047c565b6104b88482610083565b9050610486565b50505060009283526020808420604080516060810182528954605060020a908190046001605060020a0390811680845295830189905291909201899052600295909502909101805469ffffffffffffffffffff191690921773ffffffffffffffffffff0000000000000000000019168255600191909101869055865491945090041614156105815782546001605060020a031660001415806105735750825460a060020a90046001605060020a0316600014155b1561061b57610007565b5090565b82546001840180548392605060020a90046001605060020a03908116600019011690811015610007576000918252602090912060029190910201805473ffffffffffffffffffff0000000000000000000019908116605060020a9384021790915584541691021760a060020a69ffffffffffffffffffff0219811660a060020a918290046001605060020a03166001019091021790915550565b825473ffffffffffffffffffff000000000000000000001916605060020a82021769ffffffffffffffffffff1916811760a060020a69ffffffffffffffffffff02191660a060020a1783556102f956",
    "updated_at": 1474612898498,
    "links": {},
    "address": "0xd0b10a0eb2508824f8e8305938921989699321e4"
  }
};

  Contract.checkNetwork = function(callback) {
    var self = this;

    if (this.network_id != null) {
      return callback();
    }

    this.web3.version.network(function(err, result) {
      if (err) return callback(err);

      var network_id = result.toString();

      // If we have the main network,
      if (network_id == "1") {
        var possible_ids = ["1", "live", "default"];

        for (var i = 0; i < possible_ids.length; i++) {
          var id = possible_ids[i];
          if (Contract.all_networks[id] != null) {
            network_id = id;
            break;
          }
        }
      }

      if (self.all_networks[network_id] == null) {
        return callback(new Error(self.name + " error: Can't find artifacts for network id '" + network_id + "'"));
      }

      self.setNetwork(network_id);
      callback();
    })
  };

  Contract.setNetwork = function(network_id) {
    var network = this.all_networks[network_id] || {};

    this.abi             = this.prototype.abi             = network.abi;
    this.unlinked_binary = this.prototype.unlinked_binary = network.unlinked_binary;
    this.address         = this.prototype.address         = network.address;
    this.updated_at      = this.prototype.updated_at      = network.updated_at;
    this.links           = this.prototype.links           = network.links || {};

    this.network_id = network_id;
  };

  Contract.networks = function() {
    return Object.keys(this.all_networks);
  };

  Contract.link = function(name, address) {
    if (typeof name == "object") {
      Object.keys(name).forEach(function(n) {
        var a = name[n];
        Contract.link(n, a);
      });
      return;
    }

    Contract.links[name] = address;
  };

  Contract.contract_name   = Contract.prototype.contract_name   = "DoublyLinkList";
  Contract.generated_with  = Contract.prototype.generated_with  = "3.1.2";

  var properties = {
    binary: function() {
      var binary = Contract.unlinked_binary;

      Object.keys(Contract.links).forEach(function(library_name) {
        var library_address = Contract.links[library_name];
        var regex = new RegExp("__" + library_name + "_*", "g");

        binary = binary.replace(regex, library_address.replace("0x", ""));
      });

      return binary;
    }
  };

  Object.keys(properties).forEach(function(key) {
    var getter = properties[key];

    var definition = {};
    definition.enumerable = true;
    definition.configurable = false;
    definition.get = getter;

    Object.defineProperty(Contract, key, definition);
    Object.defineProperty(Contract.prototype, key, definition);
  });

  bootstrap(Contract);

  if (typeof module != "undefined" && typeof module.exports != "undefined") {
    module.exports = Contract;
  } else {
    // There will only be one version of this contract in the browser,
    // and we can use that.
    window.DoublyLinkList = Contract;
  }
})();
