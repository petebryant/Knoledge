module.exports = function(deployer) {
  deployer.deploy(StringUtils);
  deployer.autolink();
  deployer.deploy(Knoledge,"Knoledge");
};
