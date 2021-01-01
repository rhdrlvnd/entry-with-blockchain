loadScript('/home/brian/Brian/school/embeded/team_project1/iot_coap/scripts/varScript.js');

/* 실제 배포시에는 코드에 포함시키면 위험함 */
web3.personal.unlockAccount(eth.coinbase, 'bhun');
var paperContract = web3.eth.contract(vars.abi);
var paperInstance = paperContract.new({
	from: web3.eth.coinbase,
	data: vars.contractData,
	gas: '4700000'
}, function (e, contract) {
	console.log(e, contract);
	if (typeof contract.address !== 'undefined') {
			 console.log('Contract mined! address: ' + contract.address + ' transactionHash: ' + contract.transactionHash);
	}
});
